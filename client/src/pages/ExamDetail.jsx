import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, X, Search, Loader2, MessageSquare, Send, Eye, Save, Copy, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

// ── Slot config ───────────────────────────────────────────────────────────────
const buildSlots = (type) => {
  if (type === 'guts') {
    const s = [];
    for (let set = 1; set <= 8; set++)
      for (let q = 1; q <= 4; q++)
        s.push({ key:`G${set}-${q}`, label:`Set ${set} Problem ${q}`, short:`S${set}P${q}`, section:`Set ${set}`, multi:false });
    s.push({ key:'EST', label:'Estimation', short:'Est.', section:'Estimation', multi:false });
    return s;
  }
  if (type === 'shopping') {
    return [
      ...Array.from({length:24},(_,i)=>({ key:`SQ${i+1}`, label:`Question ${i+1}`, short:`Q${i+1}`, section:'Questions', multi:false })),
      { key:'SEST', label:'Estimation', short:'Est.', section:'Estimation', multi:false },
      { key:'SALT', label:'Alternate Questions', short:'Alt', section:'Alternates', multi:true },
    ];
  }
  if (type === 'team') {
    return [
      ...Array.from({length:15},(_,i)=>({ key:`T${i+1}`, label:`Question ${i+1}`, short:`Q${i+1}`, section:'Questions', multi:false })),
      { key:'TEST', label:'Tiebreak / Estimation', short:'TB', section:'Tiebreak', multi:false },
      { key:'TALT', label:'Alternate Questions', short:'Alt', section:'Alternates', multi:true },
    ];
  }
  return [
    ...Array.from({length:10},(_,i)=>({ key:`Q${i+1}`, label:`Question ${i+1}`, short:`Q${i+1}`, section:'Questions', multi:false })),
    { key:'TB',  label:'Tiebreak / Estimation', short:'TB',  section:'Tiebreak',  multi:false },
    { key:'ALT', label:'Alternate Questions',   short:'Alt', section:'Alternates', multi:true  },
  ];
};

const examTopicFilter = (type) => ({
  'indiv-alg-nt': ['Algebra','Number Theory'],
  'indiv-geo':    ['Geometry'],
  'indiv-combo':  ['Combinatorics'],
}[type] || null);

const TEMPLATE_LABELS = {
  'indiv-alg-nt':'Individual · Algebra & Number Theory',
  'indiv-geo':'Individual · Geometry',
  'indiv-combo':'Individual · Combinatorics',
  'guts':'Guts Round','shopping':'Shopping Round','team':'Team Round',
};

const deriveSlotMap = (exam) => {
  if (exam.slots && typeof exam.slots==='object' && Object.keys(exam.slots).length>0) return exam.slots;
  const slots = buildSlots(exam.templateType);
  const map = {};
  (exam.problems||[]).forEach((p,i)=>{ if(slots[i]) map[slots[i].key]=p.id; });
  return map;
};

const getSlotIds = (map,key) => { const v=map[key]; if(!v) return []; return Array.isArray(v)?v:[v]; };
const setSlotIds = (map,key,ids,multi) => {
  const next={...map};
  if(!ids||ids.length===0){delete next[key];return next;}
  next[key]=multi?ids:ids[0]; return next;
};

const fixLatex = s => {
  if(!s) return '';
  if(!(/(?<!\\)\\(?!\\)/.test(s))&&s.includes('\\\\')) return s.replace(/\\\\/g,'\\');
  return s;
};

const dl = (name,text) => {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
  a.download=name;a.click();URL.revokeObjectURL(a.href);
};

const makeTex = (exam,slotMap,byId) => {
  const slots=buildSlots(exam.templateType);
  const lines=slots.flatMap(s=>{
    const ids=getSlotIds(slotMap,s.key);
    if(ids.length===0) return [`\\item[${s.short}.] [empty]`];
    return ids.map((pid,i)=>{
      const p=byId[pid];
      return `\\item[${s.multi&&ids.length>1?`${s.short} ${i+1}.`:s.short+'.'}] [${pid}]\n${fixLatex(p?.latex||'')}`;
    });
  }).join('\n\n');
  return `\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{amsmath,amssymb,enumitem}\n\\begin{document}\n\\begin{center}{\\Huge\\textbf{${exam.name||'Exam'}}}\\end{center}\n\\vspace{.3in}\n\\begin{enumerate}\n${lines}\n\\end{enumerate}\n\\end{document}`;
};

// Topic abbreviations
const topicAbbr = t => ({Algebra:'A','Number Theory':'NT',Geometry:'G',Combinatorics:'C'}[t]||t[0]);

// Stage color config — matches screenshot
const STAGE = {
  Endorsed:      { pill:'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',  dot:'bg-green-500',  bar:'border-l-green-500'  },
  Published:     { pill:'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',       dot:'bg-blue-400',   bar:'border-l-blue-400'   },
  'Needs Review':{ pill:'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',             dot:'bg-red-500',    bar:'border-l-red-500'    },
  Idea:          { pill:'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', dot:'bg-yellow-400', bar:'border-l-yellow-400' },
};
const stageConfig = s => STAGE[s] || { pill:'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700', dot:'bg-slate-400', bar:'border-l-slate-300' };

const Spin = () => <Loader2 size={13} className="animate-spin"/>;

// ── Problem pill (inside a slot card) ─────────────────────────────────────────
// Looks like: [ MS0031 • NT 4 ] in a soft colored pill
const ProbPill = ({problem, slotKey, canEdit, onRemove, onPreview}) => {
  const sc = stageConfig(problem.stage);
  const topics = (problem.topics||[]).map(topicAbbr).join('-');
  return (
    <div
      draggable={canEdit}
      onDragStart={e=>{ e.dataTransfer.setData('problemId',problem.id); e.dataTransfer.setData('fromSlot',slotKey); e.stopPropagation(); }}
      onClick={e=>{ e.stopPropagation(); onPreview(problem); }}
      className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg border ${sc.pill} cursor-pointer hover:opacity-80 transition-all select-none text-[11px] font-semibold`}
    >
      <span className="font-mono font-bold">{problem.id}</span>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
      {topics && <span className="font-bold opacity-80">{topics}</span>}
      {problem.quality != null && <span className="ml-auto font-bold opacity-70 text-[10px]">{problem.quality}</span>}
      {canEdit && (
        <button onClick={e=>{e.stopPropagation();onRemove(slotKey,problem.id);}}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 transition flex-shrink-0">
          <X size={9}/>
        </button>
      )}
    </div>
  );
};

// ── Slot card ────────────────────────────────────────────────────────────────
const SlotCard = ({slot, problems, canEdit, onDrop, onRemove, onPreview, dragOverKey, onDragEnter, onDragLeave}) => {
  const over = dragOverKey===slot.key;
  return (
    <div
      onDragOver={e=>e.preventDefault()}
      onDragEnter={e=>{e.preventDefault();onDragEnter(slot.key);}}
      onDragLeave={onDragLeave}
      onDrop={e=>{
        e.preventDefault();
        const pid=e.dataTransfer.getData('problemId');
        const from=e.dataTransfer.getData('fromSlot')||null;
        if(pid) onDrop(slot.key,pid,from,slot.multi);
      }}
      className={`rounded-xl border-2 p-2.5 flex flex-col gap-1.5 min-h-[72px] transition-all
        ${over
          ? 'border-[#2774AE] dark:border-[#FFD100] bg-blue-50/80 dark:bg-blue-900/20 scale-[1.02]'
          : problems.length>0
          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          : 'border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/20'
        }`}
    >
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none leading-none">
        {slot.label}
      </p>
      {problems.map(p=>(
        <ProbPill key={p.id} problem={p} slotKey={slot.key} canEdit={canEdit}
          onRemove={onRemove} onPreview={onPreview}/>
      ))}
      {problems.length===0&&(
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 italic select-none">
            {canEdit?(over?'↓ drop':'drag here'):'—'}
          </p>
        </div>
      )}
      {slot.multi&&problems.length>0&&canEdit&&!over&&(
        <p className="text-[9px] text-slate-400 italic text-center select-none">+ drag more</p>
      )}
    </div>
  );
};

// ── Picker row (problem bank on the left) ────────────────────────────────────
const PickerRow = ({problem, assigned, onPreview}) => {
  const sc = stageConfig(problem.stage);
  return (
    <div
      draggable={!assigned}
      onDragStart={e=>{e.dataTransfer.setData('problemId',problem.id);e.dataTransfer.setData('fromSlot','');}}
      onClick={()=>!assigned&&onPreview(problem)}
      className={`flex items-start gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800 transition group select-none
        ${assigned?'opacity-25 pointer-events-none':'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-grab active:cursor-grabbing'}`}
    >
      <div className={`w-0.5 h-full self-stretch min-h-[32px] rounded-full flex-shrink-0 ${sc.dot} mt-0.5`}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-[#2774AE] dark:text-[#FFD100]">{problem.id}</span>
          {(problem.topics||[]).map(t=>(
            <span key={t} className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{topicAbbr(t)}</span>
          ))}
          {problem.quality!=null&&<span className="text-[10px] font-semibold text-slate-400 ml-auto">{problem.quality}/10</span>}
        </div>
        {problem.latex&&(
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-tight pointer-events-none">
            {(problem.latex||'').replace(/\$[^$]*\$/g,match=>match).replace(/\\[a-z]+\{[^}]*\}/g,'…').slice(0,60)}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Live KaTeX preview (takes over center panel) ─────────────────────────────
const LivePreview = ({slots, slotMap, byId}) => {
  const sections = useMemo(()=>{
    const m={};
    slots.forEach(s=>{(m[s.section]||(m[s.section]=[])).push(s);});
    return m;
  },[slots]);
  return (
    <div className="space-y-8">
      {Object.entries(sections).map(([sec,ss])=>(
        <div key={sec}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{sec}</p>
          {ss.map(slot=>{
            const ids=getSlotIds(slotMap,slot.key);
            if(ids.length===0) return(
              <div key={slot.key} className="flex gap-4 mb-5 opacity-30">
                <span className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0 text-right pt-0.5">{slot.label}</span>
                <span className="text-xs italic text-slate-400 border-l-2 border-slate-100 dark:border-slate-800 pl-3">empty</span>
              </div>
            );
            return ids.map((pid,i)=>{
              const p=byId[pid];
              const sc=stageConfig(p?.stage);
              return(
                <div key={pid} className="flex gap-4 mb-6">
                  <div className="w-28 flex-shrink-0 text-right pt-1">
                    {i===0&&<span className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-tight block">{slot.label}</span>}
                  </div>
                  <div className="flex-1 min-w-0 border-l-2 border-slate-100 dark:border-slate-700 pl-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono text-slate-400">{pid}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                      {p?.quality!=null&&<span className="text-[9px] text-slate-400">d={p.quality}</span>}
                    </div>
                    <div className="text-slate-800 dark:text-slate-100 leading-relaxed text-sm">
                      <KatexRenderer latex={fixLatex(p?.latex||`[${pid}]`)}/>
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      ))}
    </div>
  );
};

// ── Problem preview modal ─────────────────────────────────────────────────────
const Modal = ({p, close}) => {
  const sc = stageConfig(p.stage);
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={close}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-6 py-4 border-b border-l-4 ${sc.bar} border-slate-100 dark:border-slate-800 rounded-t-2xl`}>
          <span className="font-mono text-sm font-bold text-[#2774AE] dark:text-[#FFD100]">{p.id}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.pill}`}>{p.stage}</span>
          {(p.topics||[]).map(t=><span key={t} className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t}</span>)}
          {p.quality!=null&&<span className="text-xs text-slate-400 font-semibold ml-1">Difficulty {p.quality}/10</span>}
          <button onClick={close} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={14}/></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Problem</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-6 py-5 text-base leading-loose text-slate-800 dark:text-slate-100">
              <KatexRenderer latex={fixLatex(p.latex||'')}/>
            </div>
          </div>
          {p.solution&&(
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Solution</p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-6 py-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                <KatexRenderer latex={fixLatex(p.solution||'')}/>
              </div>
            </div>
          )}
          {p.answer&&(
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Answer</span>
              <span className="font-bold text-green-700 dark:text-green-400">{p.answer}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Discussion panel ──────────────────────────────────────────────────────────
const Discussion = ({examId, userId, isAdmin}) => {
  const [list,setList]=useState([]); const [body,setBody]=useState(''); const [posting,setPosting]=useState(false); const bot=useRef(null);
  useEffect(()=>{ if(examId) api.get(`/tests/${examId}/comments`).then(r=>setList(r.data)).catch(()=>{}); },[examId]);
  useEffect(()=>{ bot.current?.scrollIntoView({behavior:'smooth'}); },[list]);
  const post=async e=>{e.preventDefault();if(!body.trim())return;setPosting(true);try{const r=await api.post(`/tests/${examId}/comments`,{body});setList(p=>[...p,r.data]);setBody('');}catch{}finally{setPosting(false);}};
  const del=async cid=>{try{await api.delete(`/tests/${examId}/comments/${cid}`);setList(p=>p.filter(c=>c.id!==cid));}catch{}};
  return(
    <div>
      <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-32 min-h-0">
        {list.length===0?<p className="text-center text-[10px] text-slate-400 py-2">No comments.</p>:list.map(c=>(
          <div key={c.id} className="flex gap-2 group">
            <div className="w-5 h-5 rounded-full bg-[#2774AE] dark:bg-[#FFD100] flex items-center justify-center text-[8px] font-bold text-white dark:text-slate-900 flex-shrink-0">{c.user?.initials}</div>
            <div className="flex-1 min-w-0"><div className="flex items-baseline gap-1"><span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName}</span><span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div><p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{c.body}</p></div>
            {(c.user?.id===userId||isAdmin)&&<button onClick={()=>del(c.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition"><X size={10}/></button>}
          </div>
        ))}
        <div ref={bot}/>
      </div>
      <form onSubmit={post} className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();post(e);}}} placeholder="Add comment… (Enter)" rows={1} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] outline-none focus:ring-1 focus:ring-[#2774AE]/20 resize-none transition"/>
        <button type="submit" disabled={posting||!body.trim()} className="px-2.5 py-1.5 rounded-lg bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 font-bold hover:opacity-90 disabled:opacity-40 transition">{posting?<Spin/>:<Send size={11}/>}</button>
      </form>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ExamDetail() {
  const {id}=useParams(); const navigate=useNavigate();
  const [exam,setExam]=useState(null); const [loading,setLoading]=useState(true);
  const [allProbs,setAllProbs]=useState([]); const [probLoading,setProbLoading]=useState(false);
  const [me,setMe]=useState(null); const [err,setErr]=useState('');
  const [slotMap,setSlotMap]=useState({});
  const [pendingMap,setPendingMap]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const [showPreview,setShowPreview]=useState(false); // false=builder, true=preview
  const [preview,setPreview]=useState(null);
  const [search,setSearch]=useState('');
  const [topicF,setTopicF]=useState('all');
  const [stageF,setStageF]=useState('all');
  const [diffMin,setDiffMin]=useState(1);
  const [diffMax,setDiffMax]=useState(10);
  const [sortBy,setSortBy]=useState('id'); // 'id'|'diff-asc'|'diff-desc'
  const [saveState,setSaveState]=useState('idle');
  const [discOpen,setDiscOpen]=useState(false);
  const [allExams,setAllExams]=useState([]);
  const [showCopy,setShowCopy]=useState(false);
  const [copySource,setCopySource]=useState(null);
  const slotsRef=useRef([]);

  useEffect(()=>{
    api.get('/auth/me').then(r=>setMe(r.data.user)).catch(()=>{});
    api.get('/tests').then(r=>setAllExams(r.data||[])).catch(()=>{});
    (async()=>{
      setLoading(true);
      try{ const r=await api.get(`/tests/${id}`); setExam(r.data); setSlotMap(deriveSlotMap(r.data)); setPendingMap(null); }
      catch{ setErr('Failed to load.'); } finally{setLoading(false);}
    })();
    (async()=>{
      setProbLoading(true);
      try{ const r=await api.get('/problems'); setAllProbs(r.data); }catch{}finally{setProbLoading(false);}
    })();
  },[id]);

  const isAdmin=me?.isAdmin||false;
  const canEdit=exam&&(isAdmin||exam.authorId===me?.id||exam.author?.id===me?.id);
  const slots=exam?buildSlots(exam.templateType):[];
  useEffect(()=>{ slotsRef.current=slots; },[slots]);
  const autoTopics=exam?examTopicFilter(exam.templateType):null;
  const byId=useMemo(()=>{ const m={}; allProbs.forEach(p=>{m[p.id]=p;}); return m; },[allProbs]);
  const currentMap=pendingMap||slotMap;
  const isDirty=pendingMap!==null;
  const assigned=useMemo(()=>{
    const s=new Set();
    Object.values(currentMap).forEach(v=>{ if(Array.isArray(v)) v.forEach(x=>s.add(x)); else if(v) s.add(v); });
    return s;
  },[currentMap]);

  const handleSave=useCallback(async()=>{
    if(!pendingMap) return;
    setSaveState('saving');
    try{ await api.put(`/tests/${id}/slots`,{slots:pendingMap}); setSlotMap(pendingMap); setPendingMap(null); setSaveState('saved'); setTimeout(()=>setSaveState('idle'),1500); }
    catch{ setSaveState('err'); setTimeout(()=>setSaveState('idle'),3000); }
  },[id,pendingMap]);

  const updateMap=useCallback((updater)=>{
    setPendingMap(prev=>updater(prev||slotMap));
  },[slotMap]);

  const handleDrop=useCallback((toKey,pid,fromKey,multi)=>{
    updateMap(prev=>{
      let next={...prev};
      if(fromKey){ const src=slotsRef.current.find(s=>s.key===fromKey); next=setSlotIds(next,fromKey,getSlotIds(next,fromKey).filter(x=>x!==pid),src?.multi); }
      const toSlot=slotsRef.current.find(s=>s.key===toKey);
      const toIds=getSlotIds(next,toKey);
      if(multi){ if(!toIds.includes(pid)) next=setSlotIds(next,toKey,[...toIds,pid],true); }
      else{
        if(fromKey&&toIds.length>0){ const fSlot=slotsRef.current.find(s=>s.key===fromKey); next=setSlotIds(next,fromKey,[toIds[0]],fSlot?.multi); }
        next=setSlotIds(next,toKey,[pid],false);
      }
      return next;
    });
    setDragOver(null);
  },[updateMap]);

  const handleRemove=useCallback((slotKey,pid)=>{
    updateMap(prev=>{ const slot=slotsRef.current.find(s=>s.key===slotKey); return setSlotIds({...prev},slotKey,getSlotIds(prev,slotKey).filter(x=>x!==pid),slot?.multi); });
  },[updateMap]);

  const TOPICS=['Algebra','Geometry','Combinatorics','Number Theory'];
  const picker=useMemo(()=>{
    const filtered=allProbs.filter(p=>{
      if(p.stage==='Archived') return false;
      if(autoTopics&&topicF==='all'&&!(p.topics||[]).some(t=>autoTopics.includes(t))) return false;
      if(topicF!=='all'&&!(p.topics||[]).includes(topicF)) return false;
      if(stageF!=='all'&&p.stage!==stageF) return false;
      const d=p.quality??0;
      if(d<diffMin||d>diffMax) return false;
      if(search&&!p.id.toLowerCase().includes(search.toLowerCase())&&!(p.latex||'').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if(sortBy==='diff-asc') return [...filtered].sort((a,b)=>(a.quality??0)-(b.quality??0));
    if(sortBy==='diff-desc') return [...filtered].sort((a,b)=>(b.quality??0)-(a.quality??0));
    return filtered;
  },[allProbs,topicF,stageF,search,autoTopics,diffMin,diffMax,sortBy]);

  const sections=useMemo(()=>{
    const m={}; slots.forEach(s=>{(m[s.section]||(m[s.section]=[])).push(s);}); return m;
  },[slots]);

  const filledSlots=Object.keys(currentMap).filter(k=>getSlotIds(currentMap,k).length>0).length;

  if(loading) return <Layout><div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Loading…</div></Layout>;
  if(err||!exam) return <Layout><div className="max-w-xl mx-auto px-6 py-12 text-center"><p className="text-red-500 mb-3">{err||'Not found.'}</p><button onClick={()=>navigate('/exams')} className="underline text-sm text-slate-500">← Back</button></div></Layout>;

  return(
    <Layout>
      <div className="flex flex-col h-screen overflow-hidden">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0">
          <button onClick={()=>navigate('/exams')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600"><ArrowLeft size={15}/></button>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{exam.competition} · {exam.version}</p>
            <h1 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{exam.name}</h1>
            <p className="text-[10px] text-slate-400">{TEMPLATE_LABELS[exam.templateType]||exam.templateType} · by {exam.author?.firstName} {exam.author?.lastName}
              {copySource&&<span className="ml-2 text-amber-500">· Copied from {copySource.name}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-medium text-slate-400">{filledSlots}/{slots.length}</span>
            {canEdit&&(
              <button onClick={handleSave} disabled={saveState==='saving'||!isDirty}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${isDirty?'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 hover:opacity-90':'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}>
                {saveState==='saving'?<Spin/>:<Save size={12}/>}
                {saveState==='saving'?'Saving…':saveState==='saved'?'✓ Saved':'Save'}
              </button>
            )}
            <button onClick={()=>setShowPreview(v=>!v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition
                ${showPreview?'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900 border-transparent':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <Eye size={12}/> {showPreview?'Hide preview':'Preview'}
            </button>
            <button onClick={()=>dl(`${(exam.name||'exam').replace(/\s+/g,'-').toLowerCase()}.tex`,makeTex(exam,currentMap,byId))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Download size={12}/> .tex
            </button>
          </div>
        </div>

        {/* ── Main 2-panel area ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Problem Bank + Discussion (also drop target to remove from exam) */}
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Bank header */}
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Problem Bank</p>
                {autoTopics&&<span className="text-[9px] text-slate-400">({autoTopics.map(topicAbbr).join('+')} filtered)</span>}
                {/* Copy dropdown */}
                {canEdit&&(
                  <div className="relative ml-auto">
                    <button onClick={()=>setShowCopy(v=>!v)} className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-slate-600 transition font-semibold">
                      <Copy size={9}/> Copy <ChevronDown size={9}/>
                    </button>
                    {showCopy&&(
                      <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-52 overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-400 uppercase px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">Copy layout from</p>
                        {allExams.filter(e=>e.id!==id&&e.templateType===exam.templateType).length===0
                          ?<p className="text-[10px] text-slate-400 italic px-3 py-3">No other compatible exams.</p>
                          :allExams.filter(e=>e.id!==id&&e.templateType===exam.templateType).map(e=>(
                            <button key={e.id} onClick={()=>{setCopySource(e);updateMap(()=>({...deriveSlotMap(e)}));setShowCopy(false);}}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 transition">
                              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{e.name}</p>
                              <p className="text-[9px] text-slate-400">{e.author?.firstName} {e.author?.lastName}</p>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Search */}
              <div className="relative mb-1.5">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID or text…"
                  className="w-full pl-6 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2774AE]/20 transition"/>
              </div>
              {/* Topic filters */}
              <div className="flex flex-wrap gap-1 mb-1">
                {['all',...TOPICS].map(t=>(
                  <button key={t} onClick={()=>setTopicF(t)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition ${topicF===t?'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}>
                    {t==='all'?'All':topicAbbr(t)}
                  </button>
                ))}
              </div>
              {/* Stage filters */}
              <div className="flex gap-1 flex-wrap">
                {['all','Endorsed','Published','Idea','Needs Review'].map(s=>(
                  <button key={s} onClick={()=>setStageF(s)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition ${stageF===s?'bg-[#2774AE] dark:bg-[#FFD100] text-white dark:text-slate-900':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}>
                    {s==='all'?'All':s==='Needs Review'?'NR':s==='Endorsed'?'Endo':s==='Published'?'Publ':'Idea'}
                  </button>
                ))}
              </div>
              {/* Difficulty range + sort */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">Diff</span>
                <input type="number" min={1} max={10} value={diffMin} onChange={e=>setDiffMin(Math.min(Number(e.target.value),diffMax))}
                  className="w-10 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] text-center text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2774AE]/20"/>
                <span className="text-[9px] text-slate-400">–</span>
                <input type="number" min={1} max={10} value={diffMax} onChange={e=>setDiffMax(Math.max(Number(e.target.value),diffMin))}
                  className="w-10 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] text-center text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2774AE]/20"/>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                  className="ml-auto text-[9px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 py-0.5 outline-none focus:ring-1 focus:ring-[#2774AE]/20">
                  <option value="id">Sort: ID</option>
                  <option value="diff-asc">Diff ↑</option>
                  <option value="diff-desc">Diff ↓</option>
                </select>
              </div>
            </div>
            {/* Problem list — also a drop target (drop here to remove from exam) */}
            <div
              className="flex-1 overflow-y-auto"
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{
                e.preventDefault();
                const fromSlot=e.dataTransfer.getData('fromSlot');
                const pid=e.dataTransfer.getData('problemId');
                if(pid&&fromSlot) handleRemove(fromSlot,pid);
              }}
            >
              {probLoading?<div className="flex justify-center py-8"><Spin/></div>
                :picker.length===0?<p className="text-center text-[10px] text-slate-400 py-8 italic">No matches.</p>
                :picker.map(p=><PickerRow key={p.id} problem={p} assigned={assigned.has(p.id)} onPreview={setPreview}/>)}
            </div>
            {/* Discussion */}
            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button onClick={()=>setDiscOpen(v=>!v)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <MessageSquare size={11} className="text-slate-400"/>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Discussion</span>
                <ChevronDown size={11} className={`text-slate-400 ml-auto transition-transform ${discOpen?'rotate-180':''}`}/>
              </button>
              {discOpen&&(
                <div className="px-3 pb-3">
                  <Discussion examId={exam.id} userId={me?.id} isAdmin={isAdmin}/>
                </div>
              )}
            </div>
          </div>

          {/* CENTER — Slot board or Preview */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
            {showPreview?(
              <LivePreview slots={slots} slotMap={currentMap} byId={byId}/>
            ):(
              <>
                {isDirty&&(
                  <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">
                    <span>Unsaved changes.</span>
                    {canEdit&&<button onClick={handleSave} className="underline font-bold">Save now</button>}
                    <button onClick={()=>setPendingMap(null)} className="underline text-slate-500 ml-auto">Discard</button>
                  </div>
                )}
                {Object.entries(sections).map(([secName,secSlots])=>(
                  <div key={secName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{secName}</h2>
                      {secName==='Alternates'&&<p className="text-[9px] text-slate-400 mt-0.5">Drag multiple problems — all listed as alternates</p>}
                    </div>
                    <div className={`p-3 grid gap-3 ${
                      secName==='Tiebreak'||secName==='Alternates'||secName==='Estimation'?'grid-cols-1 max-w-md':
                      secSlots.length===4?'grid-cols-4':
                      secSlots.length===3?'grid-cols-3':
                      'grid-cols-2 xl:grid-cols-5'
                    }`}>
                      {secSlots.map(slot=>{
                        const probs=getSlotIds(currentMap,slot.key).map(pid=>byId[pid]).filter(Boolean);
                        return(
                          <SlotCard key={slot.key} slot={slot} problems={probs}
                            canEdit={!!canEdit} onDrop={handleDrop} onRemove={handleRemove}
                            onPreview={setPreview} dragOverKey={dragOver}
                            onDragEnter={setDragOver} onDragLeave={()=>setDragOver(null)}/>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {preview&&<Modal p={preview} close={()=>setPreview(null)}/>}
    </Layout>
  );
}

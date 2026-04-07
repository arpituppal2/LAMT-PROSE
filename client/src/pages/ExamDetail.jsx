import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, X, Search, Loader2, MessageSquare, Send, Eye, EyeOff, GripVertical } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';

// ─── Slot config ──────────────────────────────────────────────────────────────
// Each slot: { key, label, section, multi }
// multi=true means the slot can hold more than one problem (alternates)
const buildSlots = (type) => {
  if (type === 'guts') {
    const s = [];
    for (let set = 1; set <= 8; set++)
      for (let q = 1; q <= 4; q++)
        s.push({ key: `G${set}-${q}`, label: `Q${q}`, section: `Set ${set}` });
    s.push({ key: 'EST', label: 'Estimation', section: 'Tiebreak' });
    return s;
  }
  if (type === 'team') {
    return [
      ...Array.from({length:10},(_,i)=>({ key:`T${i+1}`, label:`Q${i+1}`, section:'Questions' })),
      { key:'TALT', label:'Alternates', section:'Alternates', multi:true },
    ];
  }
  // Individual (default)
  return [
    ...Array.from({length:10},(_,i)=>({ key:`Q${i+1}`, label:`Q${i+1}`, section:'Questions' })),
    { key:'TB',  label:'Tiebreak / Estimation', section:'Tiebreak' },
    { key:'ALT', label:'Alternate Questions',   section:'Alternates', multi:true },
  ];
};

const deriveSlotMap = (exam) => {
  if (exam.slots && typeof exam.slots==='object' && Object.keys(exam.slots).length>0) return exam.slots;
  const slots = buildSlots(exam.templateType);
  const map = {};
  (exam.problems||[]).forEach((p,i)=>{ if(slots[i]) map[slots[i].key]=p.id; });
  return map;
};

// ALT slot stores array of IDs; all others store single ID
const getSlotIds = (map, key) => {
  const v = map[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
};

const setSlotIds = (map, key, ids, multi) => {
  const next = {...map};
  if (!ids || ids.length===0) { delete next[key]; return next; }
  next[key] = multi ? ids : ids[0];
  return next;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fixLatex = s => {
  if (!s) return '';
  if (!(/(?<!\\)\\(?!\\)/.test(s)) && s.includes('\\\\')) return s.replace(/\\\\/g,'\\');
  return s;
};

const dl = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text],{type:'text/plain'}));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
};

const makeTex = (exam, slotMap, byId) => {
  const slots = buildSlots(exam.templateType);
  const lines = slots.flatMap(s => {
    const ids = getSlotIds(slotMap, s.key);
    if (ids.length===0) return [`\\item[${s.label}] [empty]`];
    return ids.map((pid,i)=>{
      const p = byId[pid];
      return `\\item[${s.multi&&ids.length>1?`${s.label} ${i+1}`:s.label}] [${pid}]\n${fixLatex(p?.latex||'')}`;
    });
  }).join('\n\n');
  return `\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{amsmath,amssymb,enumitem}\n\\begin{document}\n\\begin{center}{\\Huge\\textbf{${exam.name||'Exam'}}}\\end{center}\n\\vspace{.3in}\n\\begin{enumerate}\n${lines}\n\\end{enumerate}\n\\end{document}`;
};

// ─── Tiny components ──────────────────────────────────────────────────────────
const Tag = ({children,color='slate'}) => {
  const c={slate:'bg-slate-100 dark:bg-slate-800 text-slate-500',green:'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',blue:'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}[color]||'bg-slate-100 text-slate-500';
  return <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${c}`}>{children}</span>;
};

const stageColor = s => s==='Endorsed'?'green':s==='Published'?'blue':'slate';
const Spin = () => <Loader2 size={13} className="animate-spin"/>;

// ─── Problem Card (in a slot) ─────────────────────────────────────────────────
const ProbCard = ({problem, slotKey, canEdit, onRemove, onPreview, onDragStart}) => (
  <div
    className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 flex items-start gap-2 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition"
    draggable={canEdit}
    onDragStart={e=>{ e.dataTransfer.setData('problemId',problem.id); e.dataTransfer.setData('fromSlot',slotKey); onDragStart&&onDragStart(); }}
    onClick={()=>onPreview(problem)}
  >
    {canEdit && <GripVertical size={12} className="text-slate-300 flex-shrink-0 mt-0.5 cursor-grab"/>}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
        <span className="font-mono text-xs font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
        {(problem.topics||[]).map(t=><Tag key={t}>{t.slice(0,4)}</Tag>)}
        <Tag color={stageColor(problem.stage)}>{problem.stage}</Tag>
      </div>
      {problem.latex && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 pointer-events-none">
          <KatexRenderer latex={fixLatex((problem.latex||'').slice(0,180))}/>
        </div>
      )}
    </div>
    {canEdit && (
      <button onClick={e=>{e.stopPropagation();onRemove(slotKey,problem.id);}}
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition mt-0.5">
        <X size={11}/>
      </button>
    )}
  </div>
);

// ─── Slot Block ───────────────────────────────────────────────────────────────
const SlotBlock = ({slot, problems, canEdit, onDrop, onRemove, onPreview, dragOverKey, onDragEnter, onDragLeave}) => {
  const over = dragOverKey===slot.key;
  return (
    <div
      onDragOver={e=>e.preventDefault()}
      onDragEnter={()=>onDragEnter(slot.key)}
      onDragLeave={onDragLeave}
      onDrop={e=>{
        e.preventDefault();
        const pid=e.dataTransfer.getData('problemId');
        const from=e.dataTransfer.getData('fromSlot')||null;
        if(pid) onDrop(slot.key, pid, from, slot.multi);
      }}
      className={`rounded-xl border-2 p-2.5 transition-all flex flex-col gap-1.5 min-h-[80px]
        ${over
          ? 'border-ucla-blue dark:border-[#FFD100] bg-blue-50/50 dark:bg-blue-900/10'
          : problems.length>0
          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          : 'border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/30'
        }`}
    >
      {/* Slot label */}
      <div className="flex items-center gap-1.5 select-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{slot.label}</span>
        {slot.multi && problems.length>0 && <span className="text-[9px] text-slate-400">({problems.length})</span>}
      </div>

      {/* Problems in slot */}
      {problems.map(p=>(
        <ProbCard key={p.id} problem={p} slotKey={slot.key} canEdit={canEdit}
          onRemove={onRemove} onPreview={onPreview}/>
      ))}

      {/* Empty state */}
      {problems.length===0 && (
        <div className="flex-1 flex items-center justify-center py-2">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 italic select-none">
            {canEdit ? (over ? 'drop here' : 'drag a problem here') : '—'}
          </p>
        </div>
      )}

      {/* Multi-slot add hint */}
      {slot.multi && problems.length>0 && canEdit && !over && (
        <p className="text-[9px] text-slate-400 italic text-center">drag more to add</p>
      )}
    </div>
  );
};

// ─── Picker row ───────────────────────────────────────────────────────────────
const PickerRow = ({problem, assigned, onPreview}) => (
  <div
    className={`flex items-start gap-2 px-3 py-2 border-b border-slate-50 dark:border-slate-800/80 transition group select-none
      ${assigned ? 'opacity-30 pointer-events-none' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-grab active:cursor-grabbing'}`}
    draggable={!assigned}
    onDragStart={e=>{
      e.dataTransfer.setData('problemId',problem.id);
      e.dataTransfer.setData('fromSlot','');
    }}
    onClick={()=>!assigned&&onPreview(problem)}
  >
    <GripVertical size={11} className="text-slate-300 flex-shrink-0 mt-0.5"/>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="font-mono text-[11px] font-bold text-ucla-blue dark:text-[#FFD100]">{problem.id}</span>
        {(problem.topics||[]).map(t=><Tag key={t}>{t.slice(0,4)}</Tag>)}
        <Tag color={stageColor(problem.stage)}>{problem.stage}</Tag>
        {problem.quality&&<span className="text-[9px] text-slate-400 ml-auto">{problem.quality}/10</span>}
      </div>
      {problem.latex&&(
        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 pointer-events-none leading-tight">
          <KatexRenderer latex={fixLatex((problem.latex||'').slice(0,100))}/>
        </div>
      )}
    </div>
  </div>
);

// ─── Live preview ─────────────────────────────────────────────────────────────
const LivePreview = ({slots, slotMap, byId}) => {
  const sections = useMemo(()=>{
    const m={};
    slots.forEach(s=>{ (m[s.section]||(m[s.section]=[])).push(s); });
    return m;
  },[slots]);
  return (
    <div className="text-sm space-y-5">
      {Object.entries(sections).map(([sec,ss])=>(
        <div key={sec}>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{sec}</p>
          {ss.map(slot=>{
            const ids=getSlotIds(slotMap,slot.key);
            return ids.length===0?(
              <div key={slot.key} className="flex gap-2 mb-3 opacity-30">
                <span className="w-14 text-[10px] font-bold text-slate-400 text-right flex-shrink-0">{slot.label}</span>
                <span className="text-[10px] text-slate-400 italic border-l-2 border-slate-100 dark:border-slate-800 pl-2">empty</span>
              </div>
            ): ids.map((pid,i)=>{
              const p=byId[pid];
              return (
                <div key={pid} className="flex gap-2 mb-3">
                  <span className="w-14 text-[10px] font-bold text-slate-400 text-right flex-shrink-0 pt-0.5">{i===0?slot.label:''}</span>
                  <div className="flex-1 min-w-0 border-l-2 border-slate-100 dark:border-slate-800 pl-2">
                    <span className="text-[8px] font-mono text-slate-300">{pid}</span>
                    <div className="text-slate-700 dark:text-slate-200 leading-relaxed mt-0.5">
                      <KatexRenderer latex={fixLatex(p?.latex||'')}/>
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

// ─── Problem modal ────────────────────────────────────────────────────────────
const Modal = ({p, close}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={close}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-ucla-blue dark:text-[#FFD100]">{p.id}</span>
          {(p.topics||[]).map(t=><Tag key={t}>{t}</Tag>)}
          <Tag color={stageColor(p.stage)}>{p.stage}</Tag>
        </div>
        <button onClick={close} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={14}/></button>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4 text-sm leading-relaxed">
        <KatexRenderer latex={fixLatex(p.latex||'')}/>
      </div>
      {p.solution&&<div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4 text-sm leading-relaxed"><KatexRenderer latex={fixLatex(p.solution||'')}/></div>}
      {p.answer&&<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"><span className="text-[10px] font-semibold text-green-600 uppercase">Answer</span><span className="font-bold text-green-700 dark:text-green-400">{p.answer}</span></div>}
    </div>
  </div>
);

// ─── Comments ─────────────────────────────────────────────────────────────────
const Comments = ({examId, userId, isAdmin}) => {
  const [list,setList]=useState([]); const [body,setBody]=useState(''); const [posting,setPosting]=useState(false); const bot=useRef(null);
  useEffect(()=>{ if(examId) api.get(`/tests/${examId}/comments`).then(r=>setList(r.data)).catch(()=>{}); },[examId]);
  useEffect(()=>{ bot.current?.scrollIntoView({behavior:'smooth'}); },[list]);
  const post=async e=>{ e.preventDefault(); if(!body.trim()) return; setPosting(true); try{ const r=await api.post(`/tests/${examId}/comments`,{body}); setList(p=>[...p,r.data]); setBody(''); }catch{} finally{setPosting(false);} };
  const del=async cid=>{ try{ await api.delete(`/tests/${examId}/comments/${cid}`); setList(p=>p.filter(c=>c.id!==cid)); }catch{} };
  return(
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col" style={{maxHeight:'40vh'}}>
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2"><MessageSquare size={12} className="text-slate-400"/><p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Discussion</p><span className="ml-auto text-[10px] text-slate-400">{list.length}</span></div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {list.length===0?<p className="text-center text-[10px] text-slate-400 py-3">No comments.</p>:list.map(c=>(
          <div key={c.id} className="flex gap-2 group">
            <div className="w-5 h-5 rounded-full bg-ucla-blue dark:bg-[#FFD100] flex items-center justify-center text-[8px] font-bold text-white dark:text-slate-900 flex-shrink-0">{c.user?.initials}</div>
            <div className="flex-1 min-w-0"><div className="flex items-baseline gap-1"><span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{c.user?.firstName}</span><span className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div><p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{c.body}</p></div>
            {(c.user?.id===userId||isAdmin)&&<button onClick={()=>del(c.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition flex-shrink-0"><X size={10}/></button>}
          </div>
        ))}
        <div ref={bot}/>
      </div>
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">
        <form onSubmit={post} className="flex gap-1.5">
          <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();post(e);}}} placeholder="Comment… (Enter)" rows={2} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] outline-none focus:ring-1 focus:ring-ucla-blue/20 resize-none transition"/>
          <button type="submit" disabled={posting||!body.trim()} className="self-end px-2 py-1.5 rounded-lg bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900 font-bold hover:opacity-90 disabled:opacity-40 transition">{posting?<Spin/>:<Send size={11}/>}</button>
        </form>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ExamDetail() {
  const {id}=useParams(); const navigate=useNavigate();
  const [exam,setExam]=useState(null); const [loading,setLoading]=useState(true);
  const [allProbs,setAllProbs]=useState([]); const [probLoading,setProbLoading]=useState(false);
  const [me,setMe]=useState(null); const [err,setErr]=useState('');
  const [slotMap,setSlotMap]=useState({});
  const [dragOver,setDragOver]=useState(null);
  const [showPreview,setShowPreview]=useState(true);
  const [preview,setPreview]=useState(null);
  const [search,setSearch]=useState(''); const [topicF,setTopicF]=useState('all'); const [stageF,setStageF]=useState('Endorsed');
  const [saveState,setSaveState]=useState('idle'); // idle|saving|saved|err
  const saveRef=useRef(null); const slotsRef=useRef([]);

  useEffect(()=>{
    api.get('/auth/me').then(r=>setMe(r.data.user)).catch(()=>{});
    (async()=>{
      setLoading(true);
      try{ const r=await api.get(`/tests/${id}`); setExam(r.data); setSlotMap(deriveSlotMap(r.data)); }
      catch{ setErr('Failed to load exam.'); } finally{setLoading(false);}
    })();
    (async()=>{
      setProbLoading(true);
      try{ const r=await api.get('/problems'); setAllProbs(r.data); }catch{}finally{setProbLoading(false);}
    })();
  },[id]);

  const isAdmin=me?.isAdmin||false;
  const canEdit=exam&&(isAdmin||exam.authorId===me?.id||exam.author?.id===me?.id);
  const slots=exam?buildSlots(exam.templateType):[];
  useEffect(()=>{slotsRef.current=slots;},[slots]);

  const byId=useMemo(()=>{ const m={}; allProbs.forEach(p=>{m[p.id]=p;}); return m; },[allProbs]);
  const assigned=useMemo(()=>{
    const s=new Set();
    Object.values(slotMap).forEach(v=>{ if(Array.isArray(v)) v.forEach(x=>s.add(x)); else if(v) s.add(v); });
    return s;
  },[slotMap]);

  const persist=useCallback((map)=>{
    if(saveRef.current) clearTimeout(saveRef.current);
    setSaveState('saving');
    saveRef.current=setTimeout(async()=>{
      try{ await api.put(`/tests/${id}/slots`,{slots:map}); setSaveState('saved'); setTimeout(()=>setSaveState('idle'),1500); }
      catch{ setSaveState('err'); setTimeout(()=>setSaveState('idle'),3000); }
    },400);
  },[id]);

  const handleDrop=useCallback((toKey,pid,fromKey,multi)=>{
    setSlotMap(prev=>{
      let next={...prev};
      // Remove from source slot
      if(fromKey){
        const fromIds=getSlotIds(next,fromKey);
        const srcSlot=slotsRef.current.find(s=>s.key===fromKey);
        next=setSlotIds(next,fromKey,fromIds.filter(x=>x!==pid),srcSlot?.multi);
      }
      // Add to target
      const toSlot=slotsRef.current.find(s=>s.key===toKey);
      const toIds=getSlotIds(next,toKey);
      if(multi){ if(!toIds.includes(pid)) next=setSlotIds(next,toKey,[...toIds,pid],true); }
      else{
        // Swap if occupied and came from a slot
        if(fromKey&&toIds.length>0){
          const fromSlot=slotsRef.current.find(s=>s.key===fromKey);
          const displaced=toIds[0];
          next=setSlotIds(next,fromKey,[displaced],fromSlot?.multi);
        }
        next=setSlotIds(next,toKey,[pid],false);
      }
      persist(next);
      return next;
    });
    setDragOver(null);
  },[persist]);

  const handleRemove=useCallback((slotKey,pid)=>{
    setSlotMap(prev=>{
      const slot=slotsRef.current.find(s=>s.key===slotKey);
      const ids=getSlotIds(prev,slotKey).filter(x=>x!==pid);
      const next=setSlotIds({...prev},slotKey,ids,slot?.multi);
      persist(next);
      return next;
    });
  },[persist]);

  const picker=useMemo(()=>allProbs.filter(p=>{
    if(p.stage==='Archived') return false;
    if(topicF!=='all'&&!(p.topics||[]).includes(topicF)) return false;
    if(stageF!=='all'&&p.stage!==stageF) return false;
    if(search&&!p.id.toLowerCase().includes(search.toLowerCase())&&!(p.latex||'').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[allProbs,topicF,stageF,search]);

  const sections=useMemo(()=>{
    const m={};
    slots.forEach(s=>{ (m[s.section]||(m[s.section]=[])).push(s); });
    return m;
  },[slots]);

  const filledSlots=Object.keys(slotMap).filter(k=>getSlotIds(slotMap,k).length>0).length;
  const totalSlots=slots.length;

  if(loading) return <Layout><div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">Loading…</div></Layout>;
  if(err||!exam) return <Layout><div className="max-w-xl mx-auto px-6 py-12 text-center"><p className="text-red-500 mb-3">{err||'Not found.'}</p><button onClick={()=>navigate('/exams')} className="underline text-slate-500 text-sm">← Exams</button></div></Layout>;

  const TOPICS=['Algebra','Geometry','Combinatorics','Number Theory'];

  return(
    <Layout>
      <div className="max-w-[1800px] mx-auto px-4 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 pt-4 mb-6">
          <button onClick={()=>navigate('/exams')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600 flex-shrink-0"><ArrowLeft size={16}/></button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{exam.competition} · {exam.version}</p>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{exam.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <span className={`text-[10px] font-semibold ${saveState==='saving'?'text-slate-400':saveState==='saved'?'text-green-500':saveState==='err'?'text-red-500':'text-slate-300'}`}>
              {saveState==='saving'?'Saving…':saveState==='saved'?'✓ Saved':saveState==='err'?'Save failed':`${filledSlots}/${totalSlots} slots`}
            </span>
            <button onClick={()=>setShowPreview(v=>!v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {showPreview?<EyeOff size={12}/>:<Eye size={12}/>} {showPreview?'Hide preview':'Preview'}
            </button>
            <button onClick={()=>dl(`${(exam.name||'exam').replace(/\s+/g,'-').toLowerCase()}.tex`,makeTex(exam,slotMap,byId))} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Download size={12}/> Export .tex
            </button>
          </div>
        </div>

        <div className="flex gap-5 items-start">

          {/* COL 1 – Problem bank */}
          <div className="w-60 flex-shrink-0 sticky top-4 space-y-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">Problem Bank <span className="font-normal text-slate-400">— drag to slot</span></p>
                <div className="relative mb-1.5">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID or text…"
                    className="w-full pl-6 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-ucla-blue/20 transition"/>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {['all',...TOPICS].map(t=>(
                    <button key={t} onClick={()=>setTopicF(t)} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${topicF===t?'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900':'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{t==='all'?'All':t.slice(0,4)}</button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {['all','Endorsed','Published','Idea'].map(s=>(
                    <button key={s} onClick={()=>setStageF(s)} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${stageF===s?'bg-ucla-blue dark:bg-[#FFD100] text-white dark:text-slate-900':'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{s==='all'?'All':s.slice(0,4)}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto" style={{maxHeight:'calc(100vh - 360px)'}}>
                {probLoading?<div className="flex justify-center py-6"><Spin/></div>
                  :picker.length===0?<p className="text-center text-[10px] text-slate-400 py-6">No matches.</p>
                  :picker.map(p=><PickerRow key={p.id} problem={p} assigned={assigned.has(p.id)} onPreview={setPreview}/>)}
              </div>
            </div>
            <Comments examId={exam.id} userId={me?.id} isAdmin={isAdmin}/>
          </div>

          {/* COL 2 – Slot board */}
          <div className="flex-1 min-w-0 space-y-6">
            {Object.entries(sections).map(([secName,secSlots])=>(
              <div key={secName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <h2 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{secName}</h2>
                  {secName==='Alternates'&&<p className="text-[9px] text-slate-400 mt-0.5">Drop multiple problems — they'll all be listed as alternates</p>}
                </div>
                {/* Slots grid */}
                <div className={`p-3 grid gap-3 ${
                  secName==='Tiebreak'||secName==='Alternates' ? 'grid-cols-1' :
                  secSlots.length<=4 ? `grid-cols-${secSlots.length}` :
                  'grid-cols-2 xl:grid-cols-5'
                }`}>
                  {secSlots.map(slot=>{
                    const probs=getSlotIds(slotMap,slot.key).map(pid=>byId[pid]).filter(Boolean);
                    return(
                      <SlotBlock key={slot.key} slot={slot} problems={probs}
                        canEdit={!!canEdit} onDrop={handleDrop} onRemove={handleRemove}
                        onPreview={setPreview} dragOverKey={dragOver}
                        onDragEnter={setDragOver} onDragLeave={()=>setDragOver(null)}/>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* COL 3 – Live preview */}
          {showPreview&&(
            <div className="w-72 flex-shrink-0 sticky top-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Eye size={12} className="text-slate-400"/>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Live Preview</p>
                </div>
                <div className="overflow-y-auto p-4" style={{maxHeight:'calc(100vh - 160px)'}}>
                  <LivePreview slots={slots} slotMap={slotMap} byId={byId}/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {preview&&<Modal p={preview} close={()=>setPreview(null)}/>}
    </Layout>
  );
}

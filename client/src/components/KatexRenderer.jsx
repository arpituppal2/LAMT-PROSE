import { useMemo } from 'react';
import katex from 'katex';

// Parses a string and splits it into text and math segments.
// Supports $$...$$ (display) and $...$ (inline) delimiters.
function parseSegments(content) {
  const segments = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'display', value: match[1] });
    } else {
      segments.push({ type: 'inline', value: match[2] });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return segments;
}

function renderTextSegment(value) {
  const imgRegex = /!\[(.*?)\]\((data:image\/[^)]+)\)/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = imgRegex.exec(value)) !== null) {
    parts.push(
      value.slice(last, m.index)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
    );
    parts.push(`<img src="${m[2]}" alt="${m[1]}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" />`);
    last = imgRegex.lastIndex;
  }
  parts.push(
    value.slice(last)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  );
  return parts.join('');
}

const KatexRenderer = ({ latex, displayMode = false }) => {
  const html = useMemo(() => {
    if (!latex) return '';
    // Legacy: if displayMode is explicitly passed true, render entire string as display math
    if (displayMode) {
      try {
        return katex.renderToString(latex, { displayMode: true, throwOnError: false, trust: true });
      } catch (e) {
        return latex;
      }
    }
    // Default: parse text with $...$ and $$...$$ delimiters
    const segments = parseSegments(latex);
    return segments.map(seg => {
      if (seg.type === 'text') {
        return renderTextSegment(seg.value);
      }
      try {
        return katex.renderToString(seg.value, {
          displayMode: seg.type === 'display',
          throwOnError: false,
          trust: true,
        });
      } catch (e) {
        return seg.value;
      }
    }).join('');
  }, [latex, displayMode]);

  return (
    <div
      className={displayMode ? 'block my-4 katex-render-root' : 'inline-block max-w-full align-middle katex-render-root'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default KatexRenderer;

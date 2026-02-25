import { useEffect, useRef } from 'react';
import katex from 'katex';

const KatexRenderer = ({ latex, displayMode = false }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          trust: true
        });
      } catch (error) {
        console.error('KaTeX render error:', error);
        containerRef.current.textContent = latex;
      }
    }
  }, [latex, displayMode]);

  return <div ref={containerRef} className={displayMode ? 'my-4' : 'inline'} />;
};

export default KatexRenderer;

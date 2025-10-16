import React, { useEffect, useMemo, useRef } from 'react';
import { forceKatexRender, parseLatexString } from '../utils/latexUtils';

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType; // e.g., 'div', 'span', 'li'
}

const LatexRenderer: React.FC<LatexRendererProps & React.HTMLAttributes<HTMLElement>> = ({ content, className, as: Component = 'div', ...props }) => {
  const ref = useRef<HTMLElement>(null);

  // We only re-run the effect to render LaTeX when the raw content changes.
  useEffect(() => {
    if (ref.current) {
      forceKatexRender(ref.current);
    }
  }, [content]);

  // We memoize the parsed content to avoid re-parsing on every render.
  const parsedHtml = useMemo(() => parseLatexString(content), [content]);

  // We need to cast `ref` to the specific component type; 'any' is a shortcut for this generic component pattern.
  return <Component ref={ref as any} className={className} dangerouslySetInnerHTML={{ __html: parsedHtml }} {...props} />;
};

export default LatexRenderer;

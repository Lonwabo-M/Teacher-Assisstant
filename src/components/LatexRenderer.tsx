import React, { useEffect, useRef } from 'react';
import { parseLatexString, forceKatexRender } from '../utils/latexUtils';

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType; // e.g., 'div', 'span', 'li'
}

const LatexRenderer: React.FC<LatexRendererProps & React.HTMLAttributes<HTMLElement>> = ({ content, className, as: Component = 'div', ...props }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      // Manually find and render all LaTeX placeholders
      forceKatexRender(ref.current);
    }
  }, [content]); // Re-run when content changes

  // Parse the content to replace LaTeX with safe, renderable placeholders.
  // This is safer than directly injecting raw HTML from the AI.
  const safeHtml = parseLatexString(content);

  return <Component ref={ref as any} className={className} dangerouslySetInnerHTML={{ __html: safeHtml }} {...props} />;
};

export default LatexRenderer;

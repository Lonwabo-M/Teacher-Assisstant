import React from 'react';
import { preRenderLatex } from '../utils/latexUtils';

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType;
}

const LatexRenderer: React.FC<LatexRendererProps & React.HTMLAttributes<HTMLElement>> = ({ content, className, as: Component = 'div', ...props }) => {
  // Pre-render the content string, converting all LaTeX expressions into KaTeX's HTML markup.
  const preRenderedContent = preRenderLatex(content);

  // The resulting string, now with KaTeX HTML embedded, is safely rendered.
  return <Component className={className} dangerouslySetInnerHTML={{ __html: preRenderedContent }} {...props} />;
};

export default LatexRenderer;

import React from 'react';
import { preRenderLatex } from '../utils/latexUtils';

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType; // e.g., 'div', 'span', 'li'
}

const LatexRenderer: React.FC<LatexRendererProps & React.HTMLAttributes<HTMLElement>> = ({ content, className, as: Component = 'div', ...props }) => {
  // Pre-render the content string, converting any LaTeX into HTML markup.
  const renderedHtml = preRenderLatex(content);

  // We use dangerouslySetInnerHTML because the content from the Gemini API can include
  // HTML tags like <strong>, <ul>, etc., and now the rendered KaTeX HTML.
  return <Component className={className} dangerouslySetInnerHTML={{ __html: renderedHtml }} {...props} />;
};

export default LatexRenderer;

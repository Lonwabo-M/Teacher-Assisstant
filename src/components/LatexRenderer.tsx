import React from 'react';
import { preRenderLatex } from '../utils/latexUtils';
import { parseSimpleMarkdown } from '../utils/markdownUtils';

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType; // e.g., 'div', 'span', 'li'
  enableMarkdown?: boolean;
}

const LatexRenderer: React.FC<LatexRendererProps & React.HTMLAttributes<HTMLElement>> = ({ content, className, as: Component = 'div', enableMarkdown = false, ...props }) => {
  // Pre-render the content string, converting any LaTeX into HTML markup.
  let processedContent = content;
  if (enableMarkdown) {
    processedContent = parseSimpleMarkdown(processedContent);
  }
  const renderedHtml = preRenderLatex(processedContent);

  // We use dangerouslySetInnerHTML because the content from the Gemini API can include
  // HTML tags like <strong>, <ul>, etc., and now the rendered KaTeX HTML.
  return <Component className={className} dangerouslySetInnerHTML={{ __html: renderedHtml }} {...props} />;
};

export default LatexRenderer;
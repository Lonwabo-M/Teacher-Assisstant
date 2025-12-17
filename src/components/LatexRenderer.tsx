
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
  // Robustness check for non-string content
  if (content === undefined || content === null) return null;
  let processedContent = String(content);

  if (enableMarkdown && processedContent) {
      const latexMap = new Map<string, string>();
      let latexIndex = 0;
      const latexRegex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;

      const protectedContent = processedContent.replace(latexRegex, (match, p1, p2, p3, p4) => {
          if (p4 && /^\d+(\.\d{2})?$/.test(p4.trim())) {
              return match;
          }
          const placeholder = `__LATEX_PLACEHOLDER_${latexIndex++}__`;
          latexMap.set(placeholder, match);
          return placeholder;
      });

      let markdownHtml = parseSimpleMarkdown(protectedContent);

      processedContent = markdownHtml.replace(/__LATEX_PLACEHOLDER_\d+__/g, (match) => {
          return latexMap.get(match) || match;
      });
  }

  const finalHtml = preRenderLatex(processedContent);

  return <Component className={className} dangerouslySetInnerHTML={{ __html: finalHtml }} {...props} />;
};

export default LatexRenderer;


import React from 'react';
import { preRenderLatex } from '../utils/latexUtils';

interface CalculationRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

const CalculationRenderer: React.FC<CalculationRendererProps> = ({ content, className, style }) => {
  if (!content) return null;

  // Pre-process the string to enforce newlines between consecutive block equations.
  const formattedContent = content.replace(/\\\]\s*\\\[/g, '\\]\n\\[');

  // Split content into individual lines to handle text and block equations separately.
  const lines = formattedContent.split('\n');

  return (
    <div className={className} style={style}>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Check if the line is exclusively a block-level LaTeX equation.
        if (trimmedLine.startsWith('\\[') && trimmedLine.endsWith('\\]')) {
          return (
            <div
              key={index}
              className="print-item"
              dangerouslySetInnerHTML={{ __html: preRenderLatex(trimmedLine) }}
            />
          );
        } else if (trimmedLine) {
          // This is a line of text, which may itself contain inline LaTeX.
          return (
            <p
              key={index}
              className="print-item"
              dangerouslySetInnerHTML={{ __html: preRenderLatex(line) }}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default CalculationRenderer;

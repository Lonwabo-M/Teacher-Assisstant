import React from 'react';
import { preRenderLatex } from '../utils/latexUtils';

interface CalculationRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

const CalculationRenderer: React.FC<CalculationRendererProps> = ({ content, className, style }) => {
  if (!content) return null;

  // Split content into individual lines to handle text and block equations separately.
  const lines = content.split('\n');

  return (
    <div className={className} style={style}>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Check if the line is exclusively a block-level LaTeX equation.
        if (trimmedLine.startsWith('\\[') && trimmedLine.endsWith('\\]')) {
          // Render it directly. preRenderLatex will handle the KaTeX conversion,
          // and the displayMode will ensure it is centered.
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{ __html: preRenderLatex(trimmedLine) }}
            />
          );
        } else if (trimmedLine) {
          // This is a line of text, which may itself contain inline LaTeX.
          // Render it inside a paragraph to ensure it's a block element and left-aligned by default.
          return (
            <p
              key={index}
              dangerouslySetInnerHTML={{ __html: preRenderLatex(line) }}
            />
          );
        }
        // Ignore empty lines to prevent excessive vertical space.
        return null;
      })}
    </div>
  );
};

export default CalculationRenderer;

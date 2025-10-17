import React, { useEffect, useRef } from 'react';
import { forceLatexRender } from '../utils/forceLatexRender';

interface LatexRendererProps {
  content: string;
  className?: string;
  as?: React.ElementType; // e.g., 'div', 'span', 'li'
}

const LatexRenderer: React.FC<LatexRendererProps & React.HTMLAttributes<HTMLElement>> = ({ content, className, as: Component = 'div', ...props }) => {
  const ref = useRef<HTMLElement>(null);

  // This effect hook runs after React has rendered the component and its inner HTML.
  // It then calls our utility to find and render any LaTeX within the component's DOM node.
  useEffect(() => {
    if (ref.current) {
      forceLatexRender(ref.current);
    }
  }, [content]); // Re-run the effect whenever the content string changes.

  // We use dangerouslySetInnerHTML because the content from the Gemini API can include
  // HTML tags like <strong>, <ul>, <li>, etc., in addition to LaTeX markup.
  // The ref allows us to get a handle on the DOM element after React has created it.
  return <Component ref={ref as any} className={className} dangerouslySetInnerHTML={{ __html: content }} {...props} />;
};

export default LatexRenderer;
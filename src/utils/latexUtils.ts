// Utility functions for LaTeX rendering with KaTeX

// Declare KaTeX's global object, loaded from a script in index.html
declare const katex: any;

/**
 * Parses a string with LaTeX delimiters and converts them to HTML placeholders for manual rendering.
 * This is safer than dangerously setting raw user content and gives us control over the rendering process.
 * @param text The input string which may contain LaTeX and other HTML.
 * @returns An HTML string with <span/div data-latex="..."> tags.
 */
export const parseLatexString = (text: string): string => {
  if (!text) return '';
  // This regex finds block \[...\] and inline \(...\) LaTeX expressions non-greedily.
  const regex = /\\\[(.*?)\\\]|\\\((.*?)\\\)/gs;
  return text.replace(regex, (match, blockContent, inlineContent) => {
    if (blockContent !== undefined) {
      // Escape quotes and HTML tags for the data attribute
      const escapedContent = blockContent.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div data-latex="${escapedContent}"></div>`;
    }
    if (inlineContent !== undefined) {
      const escapedContent = inlineContent.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<span data-latex="${escapedContent}"></span>`;
    }
    return match; // Should not happen with this regex, but as a fallback.
  });
};


/**
 * Manually and forcefully renders all LaTeX placeholders within a given container element.
 * This function is idempotent; it will not re-render elements that have already been processed.
 */
export const forceKatexRender = (container: HTMLElement | null): void => {
  if (!container || typeof katex === 'undefined') return;

  // Find all elements with data-latex attributes that haven't been rendered yet
  const unrenderedMath = container.querySelectorAll('[data-latex]:not(.katex-rendered)');
  
  unrenderedMath.forEach(element => {
    let latex: string | null = null;
    try {
      latex = element.getAttribute('data-latex');
      if (latex) {
        katex.render(latex, element as HTMLElement, {
          displayMode: element.tagName === 'DIV',
          throwOnError: false,
        });
        // Add a class to mark as rendered to avoid re-rendering on subsequent calls
        element.classList.add('katex-rendered');
      }
    } catch (error) {
      console.warn('KaTeX render error:', error, 'for latex:', latex);
      if (element.textContent === '') {
        element.textContent = `[KaTeX Error: ${latex}]`;
      }
    }
  });
};

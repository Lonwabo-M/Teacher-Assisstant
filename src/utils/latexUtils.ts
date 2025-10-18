import katex from 'katex';

/**
 * Takes a string containing potential LaTeX expressions and pre-renders them to HTML using KaTeX.
 * This is a robust method that avoids client-side rendering race conditions.
 * @param content The input string which may contain LaTeX and other HTML.
 * @returns An HTML string with all LaTeX expressions converted to KaTeX's HTML markup.
 */
export const preRenderLatex = (content: string): string => {
  if (!content) return '';
  
  // This regex finds block \[...\] and inline \(...\) LaTeX expressions non-greedily.
  return content.replace(/\\\[(.*?)\\\]|\\\((.*?)\\\)/gs, (match, blockContent, inlineContent) => {
    const latex = blockContent || inlineContent;
    if (latex === undefined) return match;
    
    try {
      // Use katex.renderToString to convert the LaTeX string directly into an HTML string.
      return katex.renderToString(latex.trim(), {
        displayMode: !!blockContent, // True for block-level `\[...\]`, false for inline `\(...\)`
        throwOnError: false, // Don't crash the app if there's a syntax error
      });
    } catch (e) {
      console.error("KaTeX pre-rendering failed:", e);
      // Return a helpful error message in place of the broken math
      return `<span style="color: red; font-family: monospace;">[KaTeX Error: ${e.message}]</span>`;
    }
  });
};

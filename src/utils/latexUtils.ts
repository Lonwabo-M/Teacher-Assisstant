
import katex from 'katex';

/**
 * Takes a string containing potential LaTeX expressions and pre-renders them to HTML using KaTeX.
 * Sanity checks for malformed nesting often produced by LLMs.
 */
export const preRenderLatex = (content: string): string => {
  if (!content) return '';
  
  // Regex to find standard LaTeX delimiters
  return content.replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g, (match, blockContent, inlineContent, doubleDollarContent, singleDollarContent) => {
    let latex = blockContent || inlineContent || doubleDollarContent || singleDollarContent;
    const isBlock = blockContent !== undefined || doubleDollarContent !== undefined;

    if (latex === undefined) return match;
    
    // Safety check for single dollar matches
    if (singleDollarContent && /^\d+(\.\d{2})?$/.test(singleDollarContent.trim())) {
        return match;
    }

    // SANITIZATION: Fix nesting hallucinations common in LLM output
    // KaTeX cannot handle block delimiters \[ \] inside a render string.
    // We convert any nested delimiters to literal square brackets.
    latex = latex.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    latex = latex.replace(/\\\(/g, '(').replace(/\\\)/g, ')');

    try {
      const cleanedLatex = latex.trim().replace(/\f/g, '');
      return katex.renderToString(cleanedLatex, {
        displayMode: isBlock,
        throwOnError: true,
      });
    } catch (e: any) {
      console.error("KaTeX pre-rendering failed for:", `"${latex.trim()}"`, e);
      // Fallback: Display the raw LaTeX code in a styled way.
      const style = "background-color: #fee2e2; color: #b91c1c; font-family: monospace; padding: 2px 4px; border-radius: 4px; display: inline-block;";
      const title = `KaTeX Error: ${e.message.replace(/"/g, '&quot;')}`;
      return `<code style="${style}" title="${title}">${match}</code>`;
    }
  });
};

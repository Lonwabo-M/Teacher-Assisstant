// Declare KaTeX types
declare const renderMathInElement: any;
declare const katex: any;

export const forceLatexRender = (element: HTMLElement): void => {
  if (!element) return;

  // Check if KaTeX is loaded
  if (typeof renderMathInElement === 'undefined') {
    console.error('KaTeX auto-render not loaded');
    return;
  }

  try {
    // Force immediate KaTeX rendering
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      strict: false,
    });

    // Force a reflow to ensure rendering completes
    element.offsetHeight;
    
    console.log('KaTeX render triggered');
  } catch (error) {
    console.error('KaTeX rendering error:', error);
  }
};

// Wait for LaTeX AND verify it rendered
export const waitAndVerifyLatex = async (element: HTMLElement): Promise<boolean> => {
  if (!element) return false;

  // First render
  forceLatexRender(element);

  // Wait for initial render
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if KaTeX actually rendered
  const katexElements = element.querySelectorAll('.katex');
  console.log(`Found ${katexElements.length} rendered KaTeX elements`);

  // If no KaTeX elements found, try again
  if (katexElements.length === 0) {
    console.warn('No KaTeX elements found, retrying...');
    forceLatexRender(element);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Wait for fonts
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font loading issue:', e);
  }

  // Final wait
  await new Promise(resolve => setTimeout(resolve, 800));

  // Verify again
  const finalKatexCount = element.querySelectorAll('.katex').length;
  console.log(`Final KaTeX element count: ${finalKatexCount}`);

  return finalKatexCount > 0;
};

// Utility to wait for LaTeX rendering to complete
export const waitForLatexRender = async (element: HTMLElement): Promise<void> => {
  // Wait for KaTeX to render
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Wait for fonts to load
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font loading issue:', e);
  }
  
  // Extra buffer time
  await new Promise(resolve => setTimeout(resolve, 500));
};


/**
 * Applies CSS fixes to a cloned document for better KaTeX rendering in html2canvas.
 */
export const addKatexFixes = (clonedDoc: Document) => {
  const style = clonedDoc.createElement('style');
  style.innerHTML = `
    .katex .frac-line {
      border: none !important;
      height: 1.2px !important; 
      background-color: currentColor !important;
      opacity: 1 !important;
    }
    .katex .sqrt-line {
       height: 1.2px !important;
       background-color: currentColor !important;
       border: none !important;
       opacity: 1 !important;
    }
    .katex {
      font-variant: normal !important;
      line-height: normal !important;
    }
    .print-item {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .print-item-group {
      break-inside: auto !important;
    }
  `;
  clonedDoc.head.appendChild(style);
};

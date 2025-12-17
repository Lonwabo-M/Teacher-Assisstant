
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DownloadPdfOptions {
  filename: string;
  element: HTMLElement;
  orientation?: 'p' | 'l' | 'portrait' | 'landscape';
  format?: string;
  margin?: number;
}

const addKatexFixes = (clonedDoc: Document) => {
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
  `;
  clonedDoc.head.appendChild(style);
};

const adjustLayoutForPageBreaks = (container: HTMLElement, logicalPageHeight: number) => {
    // Collect all elements that should stay together
    const items = Array.from(container.querySelectorAll('.print-item')) as HTMLElement[];
    
    // Sort items by their top position to handle them sequentially
    items.sort((a, b) => a.offsetTop - b.offsetTop);

    const buffer = 5; // Minimal safety margin

    items.forEach((item) => {
        // Recalculate offsetTop as it might have changed due to previous shifts
        const itemTop = item.offsetTop;
        const itemHeight = item.offsetHeight;
        const itemBottom = itemTop + itemHeight;

        // Determine current page status
        const startPage = Math.floor(itemTop / logicalPageHeight);
        const endPage = Math.floor((itemBottom - 1) / logicalPageHeight);

        // If it straddles a page break and fits on one page
        if (startPage !== endPage && itemHeight <= logicalPageHeight) {
            const nextPageStart = (startPage + 1) * logicalPageHeight;
            const shiftNeeded = nextPageStart - itemTop;
            
            // Apply margin to push it to the next page
            const currentMargin = parseFloat(window.getComputedStyle(item).marginTop) || 0;
            item.style.marginTop = `${currentMargin + shiftNeeded + buffer}px`;
        }
    });
};

export const downloadPdf = async ({
  filename,
  element,
  orientation = 'p',
  format = 'a4',
  margin = 40 
}: DownloadPdfOptions) => {
  const pdf = new jsPDF(orientation, 'pt', format);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const contentWidthPt = pdfWidth - (margin * 2);
  const contentHeightPt = pdfHeight - (margin * 2);

  const logicalWidthPx = 800;
  const ptPerPx = contentWidthPt / logicalWidthPx;
  const logicalPageHeightPx = contentHeightPt / ptPerPx;

  const clone = element.cloneNode(true) as HTMLElement;
  const helperContainer = document.createElement('div');
  helperContainer.style.position = 'absolute';
  helperContainer.style.top = '0';
  helperContainer.style.left = '0';
  helperContainer.style.width = `${logicalWidthPx}px`;
  helperContainer.style.background = 'white';
  helperContainer.style.zIndex = '-9999';
  helperContainer.style.visibility = 'hidden';
  helperContainer.appendChild(clone);
  document.body.appendChild(helperContainer);

  // Apply break adjustments
  adjustLayoutForPageBreaks(clone, logicalPageHeightPx);

  try {
      const canvas = await html2canvas(clone, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: logicalWidthPx,
        onclone: (doc) => {
            addKatexFixes(doc);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgProps = pdf.getImageProperties(imgData);
      const totalImgHeightPt = (imgProps.height * contentWidthPt) / imgProps.width;

      let heightRemainingPt = totalImgHeightPt;
      let yOffsetPt = 0;

      let isFirstPage = true;
      while (heightRemainingPt > 0.5) {
        if (!isFirstPage) pdf.addPage();
        
        pdf.addImage(
            imgData, 
            'JPEG', 
            margin, 
            margin + yOffsetPt, 
            contentWidthPt, 
            totalImgHeightPt,
            undefined,
            'FAST'
        );
        
        yOffsetPt -= contentHeightPt;
        heightRemainingPt -= contentHeightPt;
        isFirstPage = false;
      }

      pdf.save(filename);
  } finally {
      document.body.removeChild(helperContainer);
  }
};

export const downloadElementAsImage = async (element: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      onclone: addKatexFixes
    });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Failed to download image:", error);
    throw error;
  }
};

export const downloadSlidesPdf = async ({ filename, container, slideSelector }: { filename: string, container: HTMLElement, slideSelector: string }) => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const slideElements = Array.from(container.querySelectorAll<HTMLElement>(slideSelector));
    
    for (let i = 0; i < slideElements.length; i++) {
        const slideElement = slideElements[i];
        const canvas = await html2canvas(slideElement, { 
          scale: 2, 
          logging: false,
          useCORS: true,
          backgroundColor: '#ffffff',
          onclone: addKatexFixes 
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    }
    pdf.save(filename);
}

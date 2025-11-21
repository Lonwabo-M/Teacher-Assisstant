import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface DownloadOptions {
  element: HTMLElement;
  filename: string;
  format?: 'png' | 'jpeg' | 'pdf';
  scale?: number;
  backgroundColor?: string;
  quality?: number;
  onDownloadStart?: () => void;
  onDownloadEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Generic download function for converting HTML elements to images or PDFs
 */
export const downloadElement = async (options: DownloadOptions): Promise<void> => {
  const {
    element,
    filename,
    format = 'png',
    scale = 2,
    backgroundColor = '#ffffff',
    quality = 0.9,
    onDownloadStart,
    onDownloadEnd,
    onError
  } = options;

  if (!element) {
    const error = new Error('Element is required for download');
    onError?.(error);
    throw error;
  }

  onDownloadStart?.();

  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
    });

    if (format === 'pdf') {
      // Generate PDF
      const imgData = canvas.toDataURL('image/jpeg', quality);
      const pdf = new jsPDF('p', 'px', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.height / imgProps.width;
      const imgHeight = pdfWidth * ratio;
      
      let heightLeft = imgHeight;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -heightLeft, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${filename}.pdf`);
    } else {
      // Generate image
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Download failed');
    onError?.(err);
    throw err;
  } finally {
    onDownloadEnd?.();
  }
};

/**
 * Simplified download function for basic image downloads
 */
export const downloadAsImage = async (
  element: HTMLElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> => {
  return downloadElement({
    element,
    filename,
    format,
    onError: (error) => {
      console.error(`Failed to download ${format}:`, error);
      alert(`Could not download the ${format}.`);
    }
  });
};

/**
 * Simplified download function for PDF downloads
 */
export const downloadAsPDF = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
  return downloadElement({
    element,
    filename,
    format: 'pdf',
    onError: (error) => {
      console.error('Failed to download PDF:', error);
      alert('Could not download the PDF.');
    }
  });
};
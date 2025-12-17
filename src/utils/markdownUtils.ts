
export const parseSimpleMarkdown = (text: string | undefined): string => {
  if (!text) return '';

  const processInlines = (line: string): string => {
    if (!line) return '';
    // Process markdown for inline elements. Order is important.
    return line
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold and Italic: ***text***
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // Bold: **text**
      .replace(/\*(.*?)\*/g, '<em>$1</em>');                  // Italic: *text*
  };

  const lines = text.split('\n');
  const newLines: string[] = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmedLine = line.trim();

    // Table handling
    const isTableRow = trimmedLine.startsWith('|') && (trimmedLine.match(/\|/g) || []).length > 1;
    const isTableSeparator = isTableRow && /^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmedLine);

    if (isTableRow && !isTableSeparator) {
        const nextLine = (i + 1 < lines.length) ? lines[i + 1]?.trim() : '';
        const nextIsSeparator = nextLine?.startsWith('|') && /^\|(?:\s*:?-+:?\s*\|)+$/.test(nextLine);

        if (nextIsSeparator) { // Header row
            if (inTable) newLines.push('</tbody></table></div>');
            if (inList) { newLines.push('</ul>'); inList = false; }

            const cells = trimmedLine.split('|').slice(1, -1).map(c => c.trim());
            newLines.push('<div class="my-4 overflow-x-auto print-item"><table class="w-full text-sm border border-slate-300 border-collapse">');
            inTable = true;
            newLines.push('<thead><tr class="bg-slate-100">');
            cells.forEach(cell => {
                newLines.push(`<th class="p-2 border border-slate-300 text-left font-semibold">${processInlines(cell)}</th>`);
            });
            newLines.push('</tr></thead><tbody>');
            i++; // Skip separator
            continue;
        } else if (inTable) { // Body row
            const cells = trimmedLine.split('|').slice(1, -1).map(c => c.trim());
            newLines.push('<tr>');
            cells.forEach(cell => {
                newLines.push(`<td class="p-2 border border-slate-300">${processInlines(cell)}</td>`);
            });
            newLines.push('</tr>');
            continue;
        }
    }

    if (inTable && !isTableRow) {
        newLines.push('</tbody></table></div>');
        inTable = false;
    }
    
    if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        newLines.push('<ul class="list-disc list-outside space-y-1 my-2 pl-5 print-item">');
        inList = true;
      }
      newLines.push(`<li>${processInlines(trimmedLine.substring(2))}</li>`);
    } else {
      if (inList) {
        newLines.push('</ul>');
        inList = false;
      }
      
      if (/^(\* *){3,}$|^(- *){3,}$|^(_ *){3,}$/.test(trimmedLine)) {
        newLines.push('<hr class="my-6 border-slate-300 print-item" />');
      } else if (trimmedLine.startsWith('###### ')) {
        newLines.push(`<h6 class="font-semibold text-slate-700 text-sm mt-2 mb-1 print-item">${processInlines(trimmedLine.substring(7))}</h6>`);
      } else if (trimmedLine.startsWith('##### ')) {
        newLines.push(`<h5 class="font-semibold text-slate-700 text-base mt-3 mb-1 print-item">${processInlines(trimmedLine.substring(6))}</h5>`);
      } else if (trimmedLine.startsWith('#### ')) {
        newLines.push(`<h4 class="font-semibold text-slate-700 text-lg mt-4 mb-2 print-item">${processInlines(trimmedLine.substring(5))}</h4>`);
      } else if (trimmedLine.startsWith('### ')) {
        newLines.push(`<h3 class="font-bold text-slate-800 text-lg mt-5 mb-2 print-item">${processInlines(trimmedLine.substring(4))}</h3>`);
      } else if (trimmedLine.startsWith('## ')) {
        newLines.push(`<h2 class="font-bold text-slate-800 text-xl mt-6 mb-3 border-b border-slate-300 pb-2 print-item">${processInlines(trimmedLine.substring(3))}</h2>`);
      } else if (trimmedLine.startsWith('# ')) {
        newLines.push(`<h1 class="font-extrabold text-slate-900 text-2xl mt-8 mb-4 border-b border-slate-300 pb-3 print-item">${processInlines(trimmedLine.substring(2))}</h1>`);
      } else if (trimmedLine.startsWith('> ')) {
        newLines.push(`<blockquote class="border-l-4 border-slate-300 pl-4 py-2 my-4 bg-slate-50 italic text-slate-700 print-item">${processInlines(trimmedLine.substring(2))}</blockquote>`);
      } else if (trimmedLine.length > 0) {
        newLines.push(`<p class="print-item">${processInlines(line)}</p>`);
      } else {
        newLines.push('');
      }
    }
  }

  if (inList) newLines.push('</ul>');
  if (inTable) newLines.push('</tbody></table></div>');

  return newLines.join('\n');
};

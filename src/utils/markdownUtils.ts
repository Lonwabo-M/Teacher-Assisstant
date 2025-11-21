export const parseSimpleMarkdown = (text: string): string => {
  if (!text) return '';

  const processInlines = (line: string): string => {
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
    const trimmedLine = line.trim();

    // Check for table rows
    const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
    // More robust separator check for ---, :---, ---:, :---:
    const isTableSeparator = isTableRow && /^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmedLine);

    if (isTableRow && !isTableSeparator) {
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
        const nextIsSeparator = nextLine.startsWith('|') && /^\|(?:\s*:?-+:?\s*\|)+$/.test(nextLine);

        if (nextIsSeparator) { // This is a header row
            if (inTable) { // close previous table if any
                newLines.push('</tbody></table></div>');
            }
            if (inList) { // close previous list if any
                newLines.push('</ul>');
                inList = false;
            }

            const cells = trimmedLine.split('|').slice(1, -1).map(c => c.trim());
            newLines.push('<div class="my-4 overflow-x-auto"><table class="w-full text-sm border border-slate-300 border-collapse">');
            inTable = true;
            newLines.push('<thead><tr class="bg-slate-100">');
            cells.forEach(cell => {
                newLines.push(`<th class="p-2 border border-slate-300 text-left font-semibold">${processInlines(cell)}</th>`);
            });
            newLines.push('</tr></thead><tbody>');
            i++; // Skip the separator line
            continue;
        } else if (inTable) { // This is a body row
            const cells = trimmedLine.split('|').slice(1, -1).map(c => c.trim());
            newLines.push('<tr>');
            cells.forEach(cell => {
                newLines.push(`<td class="p-2 border border-slate-300">${processInlines(cell)}</td>`);
            });
            newLines.push('</tr>');
            continue;
        }
    }

    // If we were in a table and this line is not a table row, close the table.
    if (inTable && !isTableRow) {
        newLines.push('</tbody></table></div>');
        inTable = false;
    }
    
    if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        newLines.push('<ul class="list-disc list-outside space-y-1 my-2 pl-5">');
        inList = true;
      }
      newLines.push(`<li>${processInlines(trimmedLine.substring(2))}</li>`);
    } else {
      if (inList) {
        newLines.push('</ul>');
        inList = false;
      }
      
      // Horizontal Rule
      if (/^(\* *){3,}$|^(- *){3,}$|^(_ *){3,}$/.test(trimmedLine)) {
        newLines.push('<hr class="my-6 border-slate-300" />');
      // Headings
      } else if (trimmedLine.startsWith('###### ')) {
        newLines.push(`<h6 class="font-semibold text-slate-700 text-sm mt-2 mb-1">${processInlines(trimmedLine.substring(7))}</h6>`);
      } else if (trimmedLine.startsWith('##### ')) {
        newLines.push(`<h5 class="font-semibold text-slate-700 text-base mt-3 mb-1">${processInlines(trimmedLine.substring(6))}</h5>`);
      } else if (trimmedLine.startsWith('#### ')) {
        newLines.push(`<h4 class="font-semibold text-slate-700 text-lg mt-4 mb-2">${processInlines(trimmedLine.substring(5))}</h4>`);
      } else if (trimmedLine.startsWith('### ')) {
        newLines.push(`<h3 class="font-semibold text-slate-800 text-xl mt-5 mb-2">${processInlines(trimmedLine.substring(4))}</h3>`);
      } else if (trimmedLine.startsWith('## ')) {
        newLines.push(`<h2 class="font-bold text-slate-800 text-2xl mt-6 mb-3 border-b border-slate-200 pb-2">${processInlines(trimmedLine.substring(3))}</h2>`);
      } else if (trimmedLine.startsWith('# ')) {
        newLines.push(`<h1 class="font-extrabold text-slate-900 text-3xl mt-8 mb-4 border-b border-slate-300 pb-3">${processInlines(trimmedLine.substring(2))}</h1>`);
      }
      else {
        // Just a regular line of text. It might be empty.
        newLines.push(processInlines(line));
      }
    }
  }

  // Close any open tags at the end of the text
  if (inList) {
    newLines.push('</ul>');
  }
  if (inTable) {
    newLines.push('</tbody></table></div>');
  }

  return newLines.join('\n'); // Join with \n to respect whitespace-pre-wrap
};
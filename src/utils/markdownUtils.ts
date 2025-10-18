export const parseSimpleMarkdown = (text: string): string => {
  if (!text) return '';

  const lines = text.split('\n');
  const newLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for list items first
    if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        // Using Tailwind classes that are available in the project.
        newLines.push('<ul class="list-disc list-outside space-y-1 my-2 pl-5">');
        inList = true;
      }
      // Remove the '- ' prefix
      newLines.push(`<li>${trimmedLine.substring(2)}</li>`);
    } else {
      // If it's not a list item, any existing list must end.
      if (inList) {
        newLines.push('</ul>');
        inList = false;
      }

      if (trimmedLine.startsWith('### ')) {
         // Using Tailwind classes for styling.
        newLines.push(`<h4 class="font-semibold text-slate-700 text-lg mt-4 mb-2">${trimmedLine.substring(4)}</h4>`);
      } else {
        // Just a regular line of text. It might be empty, which is fine.
        newLines.push(line);
      }
    }
  }

  // Close any open list at the end of the text
  if (inList) {
    newLines.push('</ul>');
  }

  return newLines.join('\n');
};
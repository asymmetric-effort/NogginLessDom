/**
 * Simple markdown-to-HTML converter.
 * Zero dependencies — handles the subset of markdown used in the project docs.
 *
 * Dogfoods NogginLessDom's own DOM classes (Document, Element, TextNode)
 * instead of string concatenation, proving the DOM implementation's correctness.
 */

import { Document, Element, TextNode } from '../../src/dom/index.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Process inline markdown formatting and return an HTML string.
 * This string is then set via element.innerHTML to create proper DOM nodes.
 */
function processInline(text: string): string {
  // Images: ![alt](src)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* (but not inside **)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Inline code: `text`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

/**
 * Set the inline-formatted content of an element.
 * Uses innerHTML setter (our own HTML parser) to parse inline markup.
 */
function setInlineContent(el: Element, rawText: string): void {
  const html = processInline(escapeHtml(rawText));
  // If there's no inline formatting, just use a text node (avoids parser round-trip)
  if (html === escapeHtml(rawText)) {
    el.textContent = rawText;
  } else {
    el.innerHTML = html;
  }
}

export function markdownToHtml(markdown: string): string {
  const doc = new Document();
  const container = doc.createElement('div');

  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      const lang = codeMatch[1];
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      const pre = doc.createElement('pre');
      const code = doc.createElement('code');
      if (lang) {
        code.setAttribute('class', `language-${lang}`);
      }
      code.appendChild(doc.createTextNode(codeLines.join('\n')));
      pre.appendChild(code);
      container.appendChild(pre);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = doc.createElement(`h${level}`);
      setInlineContent(heading, headingMatch[2]);
      container.appendChild(heading);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim())) {
      const hr = doc.createElement('hr');
      container.appendChild(hr);
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trimStart().startsWith('> ') || lines[i].trimStart().startsWith('>'))) {
        quoteLines.push(lines[i].trimStart().replace(/^>\s?/, ''));
        i++;
      }
      const blockquote = doc.createElement('blockquote');
      // Recursively convert the blockquote content
      blockquote.innerHTML = markdownToHtml(quoteLines.join('\n'));
      container.appendChild(blockquote);
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+[-|:\s]+\s*$/.test(lines[i + 1])) {
      const parseRow = (row: string): string[] => {
        return row.split('|').map(c => c.trim()).filter((_, idx, arr) => {
          if (idx === 0 && arr[idx] === '') return false;
          if (idx === arr.length - 1 && arr[idx] === '') return false;
          return true;
        });
      };
      const headers = parseRow(line);
      i++; // skip separator
      i++; // move to first data row
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseRow(lines[i]));
        i++;
      }

      const table = doc.createElement('table');
      const thead = doc.createElement('thead');
      const headerRow = doc.createElement('tr');
      for (const h of headers) {
        const th = doc.createElement('th');
        setInlineContent(th, h);
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = doc.createElement('tbody');
      for (const row of rows) {
        const tr = doc.createElement('tr');
        for (const cell of row) {
          const td = doc.createElement('td');
          setInlineContent(td, cell);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      container.appendChild(table);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^\s*[-*]\s+/, '');
        i++;
        while (i < lines.length && lines[i].match(/^\s{2,}/) && !/^\s*[-*]\s+/.test(lines[i])) {
          itemText += ' ' + lines[i].trim();
          i++;
        }
        listItems.push(itemText);
      }

      const ul = doc.createElement('ul');
      for (const item of listItems) {
        const li = doc.createElement('li');
        setInlineContent(li, item);
        ul.appendChild(li);
      }
      container.appendChild(ul);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^\s*\d+\.\s+/, '');
        i++;
        while (i < lines.length && lines[i].match(/^\s{2,}/) && !/^\s*\d+\.\s+/.test(lines[i])) {
          itemText += ' ' + lines[i].trim();
          i++;
        }
        listItems.push(itemText);
      }

      const ol = doc.createElement('ol');
      for (const item of listItems) {
        const li = doc.createElement('li');
        setInlineContent(li, item);
        ol.appendChild(li);
      }
      container.appendChild(ol);
      continue;
    }

    // HTML comment — skip
    if (line.trimStart().startsWith('<!--')) {
      while (i < lines.length && !lines[i].includes('-->')) {
        i++;
      }
      i++; // skip the closing line
      continue;
    }

    // Raw HTML tags (like <img>, <br>, etc.) — parse through our own parser
    if (/^\s*<[a-zA-Z]/.test(line)) {
      // Use a temporary element to parse the raw HTML via our innerHTML setter
      const temp = doc.createElement('span');
      temp.innerHTML = line.trim();
      // Move parsed children into container
      for (const child of [...temp.childNodes]) {
        container.appendChild(child);
      }
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^\s*[-*]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/) &&
      !lines[i].match(/^\s*>/) &&
      !lines[i].match(/^(-{3,}|_{3,}|\*{3,})\s*$/) &&
      !lines[i].match(/^\s*<[a-zA-Z]/) &&
      !lines[i].match(/^\s*<!--/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const p = doc.createElement('p');
      setInlineContent(p, paraLines.join(' '));
      container.appendChild(p);
    }
  }

  return container.innerHTML;
}

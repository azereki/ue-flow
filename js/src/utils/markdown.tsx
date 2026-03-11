import type { ReactNode } from 'react';

/** Parse a simple markdown string into React elements. */
export function renderMarkdown(text: string): ReactNode {
  // Split into blocks by double newline
  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Code block
    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n');
      const code = lines.slice(1, lines.length - (lines[lines.length - 1] === '```' ? 1 : 0)).join('\n');
      return <pre key={i} className="ueflow-md-code-block"><code>{code}</code></pre>;
    }

    // Bullet list
    if (/^[-*]\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(l => /^[-*]\s/.test(l.trim()));
      return (
        <ul key={i} className="ueflow-md-list">
          {items.map((item, j) => <li key={j}>{renderInline(item.replace(/^[-*]\s+/, ''))}</li>)}
        </ul>
      );
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(l => /^\d+\.\s/.test(l.trim()));
      return (
        <ol key={i} className="ueflow-md-list">
          {items.map((item, j) => <li key={j}>{renderInline(item.replace(/^\d+\.\s+/, ''))}</li>)}
        </ol>
      );
    }

    // Paragraph
    return <p key={i} className="ueflow-md-paragraph">{renderInline(trimmed)}</p>;
  });
}

/** Render inline markdown (bold, italic, code). */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(<code key={key++} className="ueflow-md-code">{codeMatch[2]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold (**text** or __text__)
    const boldMatch = remaining.match(/^(.*?)(?:\*\*|__)(.+?)(?:\*\*|__)/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic (*text* or _text_)
    const italicMatch = remaining.match(/^(.*?)(?:\*|_)(.+?)(?:\*|_)/s);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // No more patterns — push the rest as plain text
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

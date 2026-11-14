import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

/**
 * Parses and renders inline markdown tokens:
 * - HTML <br> / <br/> / <br /> tags
 * - Inline Code (`code`)
 * - Bold + Italic (***text***)
 * - Bold (**text** / __text__)
 * - Italic (*text* / _text_)
 * - Links ([text](url))
 * - Strikethrough (~~text~~)
 */
function renderInlineMarkdown(text) {
  if (!text) return null;

  // Token regex for inline patterns (inline code first to avoid parsing tags inside backticks)
  const tokenRegex = /(`[^`]+`|<br\s*\/?>|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|\[[^\]]+\]\([^)]+\)|~~[^~]+~~)/gi;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code: `code` (checked first to preserve backtick content)
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 font-mono text-[11px] sm:text-xs bg-slate-100 text-purple-700 rounded-md border border-slate-200/80 font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // HTML <br> tag
    if (/^<br\s*\/?>$/i.test(part)) {
      return <br key={index} />;
    }

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={index} className="font-extrabold italic text-slate-900">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      return (
        <strong key={index} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through text-slate-400">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-brand-600 hover:text-brand-800 font-bold underline underline-offset-2 transition-colors"
        >
          <span>{linkMatch[1]}</span>
          <ExternalLink className="w-3 h-3 inline-block ml-0.5 opacity-70" />
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

/**
 * Pre-processes AI output to normalize HTML tags into Markdown equivalents
 * before the block parser runs. Protects code blocks and inline code.
 */
function preprocessContent(text) {
  if (!text) return '';
  let result = text;

  // 1. Protect fenced code blocks from modification
  const codeBlocks = [];
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\n__CODEBLOCK_${codeBlocks.length - 1}__\n`;
  });

  // 2. Protect inline code spans
  const inlineCodes = [];
  result = result.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match);
    return `__ICODE_${inlineCodes.length - 1}__`;
  });

  // 3. Convert HTML tags to Markdown equivalents
  result = result.replace(/<br\s*\/?>/gi, '\n');
  result = result.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  result = result.replace(/<p[^>]*>/gi, '\n');
  result = result.replace(/<\/p>/gi, '\n');
  result = result.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  result = result.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
  result = result.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
  result = result.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
  result = result.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
  result = result.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  result = result.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  result = result.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  result = result.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  result = result.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  result = result.replace(/<\/?[uo]l[^>]*>/gi, '\n');
  result = result.replace(/<hr\s*\/?>/gi, '\n---\n');
  result = result.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) =>
    c.split('\n').map(l => `> ${l.trim()}`).join('\n') + '\n'
  );

  // 4. Strip remaining HTML tags (only valid tag patterns to avoid stripping < in math/text)
  result = result.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\s*\/?>/g, '');

  // 5. Decode common HTML entities
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&nbsp;/g, ' ');

  // 6. Restore protected content
  inlineCodes.forEach((code, idx) => {
    result = result.replace(`__ICODE_${idx}__`, code);
  });
  codeBlocks.forEach((block, idx) => {
    result = result.replace(`__CODEBLOCK_${idx}__`, block);
  });

  // 7. Normalize excessive newlines (3+ → 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Code Block Component with copy-to-clipboard and syntax banner
 */
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-400 text-xs">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono uppercase text-[10px] font-bold text-slate-300">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-medium cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Responsive Markdown Table Component
 */
function MarkdownTable({ headers, rows }) {
  if (!headers.length && !rows.length) return null;

  return (
    <div className="my-3 overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-2.5 font-bold text-slate-900 tracking-tight whitespace-nowrap"
                >
                  {renderInlineMarkdown(header.trim())}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-slate-50 transition-colors'}
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2.5 text-slate-700 align-top">
                  {renderInlineMarkdown(cell.trim())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main MarkdownRenderer Component
 * Parses markdown blocks and renders rich structured React elements.
 */
export const MarkdownRenderer = ({ content, className = '', preserveLineBreaks = false }) => {
  if (!content) return null;

  const processed = preprocessContent(content);
  const lines = processed.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block: ```language
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      elements.push(
        <CodeBlock
          key={`code-${elements.length}`}
          language={language}
          code={codeLines.join('\n')}
        />
      );
      continue;
    }

    // 2. Markdown Table Detection: line with | and next line with |---|
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Parse header
        const rawHeaders = tableLines[0].slice(1, -1).split('|');
        const headers = rawHeaders.map((h) => h.trim());

        // Check if second line is separator (e.g. |---|---|)
        const isSep = /^\|[\s-:]+(\|[\s-:]+)+\|$/.test(tableLines[1]);
        const dataStart = isSep ? 2 : 1;

        const rows = [];
        for (let r = dataStart; r < tableLines.length; r++) {
          const cells = tableLines[r].slice(1, -1).split('|');
          rows.push(cells.map((c) => c.trim()));
        }

        elements.push(
          <MarkdownTable
            key={`table-${elements.length}`}
            headers={headers}
            rows={rows}
          />
        );
        continue;
      }
    }

    // 3. Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-lg sm:text-xl font-black text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200/80">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-base sm:text-lg font-extrabold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-xs sm:text-sm font-bold text-slate-900 mt-2.5 mb-1 text-brand-700">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-xs font-bold text-slate-800 mt-2 mb-1 uppercase tracking-wider text-[11px]">
          {renderInlineMarkdown(trimmed.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // 4. Horizontal Rule: --- or ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(
        <hr key={`hr-${elements.length}`} className="my-3 border-t border-slate-200/80" />
      );
      i++;
      continue;
    }

    // 5. Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <div
          key={`quote-${elements.length}`}
          className="my-2.5 pl-3.5 py-1 border-l-3 border-brand-500 bg-brand-50/40 rounded-r-xl text-slate-700 text-xs sm:text-sm italic"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineMarkdown(ql)}</p>
          ))}
        </div>
      );
      continue;
    }

    // 6. Unordered / Bullet List with nesting: - item, * item, + item
    if (/^[-*+]\s+/.test(trimmed)) {
      const topItems = [];

      while (i < lines.length) {
        const raw = lines[i];
        const stripped = raw.trimStart();
        const indent = raw.length - stripped.length;
        const isBullet = /^[-*+]\s+/.test(stripped);
        const isNumber = /^\d+\.\s+/.test(stripped);

        if (!isBullet && !isNumber) break;
        if (isNumber && indent <= 1 && topItems.length > 0) break;

        const itemText = isBullet
          ? stripped.replace(/^[-*+]\s+/, '')
          : stripped.replace(/^\d+\.\s+/, '');

        if (indent <= 1) {
          topItems.push({ text: itemText, children: [] });
        } else if (topItems.length > 0) {
          topItems[topItems.length - 1].children.push(itemText);
        } else {
          topItems.push({ text: itemText, children: [] });
        }
        i++;
      }

      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {topItems.map((item, lIdx) => (
            <li key={lIdx} className="text-slate-700 text-xs sm:text-sm">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                <span className="flex-1">{renderInlineMarkdown(item.text)}</span>
              </div>
              {item.children.length > 0 && (
                <ul className="mt-1 ml-5 space-y-1">
                  {item.children.map((child, cIdx) => (
                    <li key={cIdx} className="flex items-start space-x-2 text-slate-600 text-xs sm:text-sm">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span className="flex-1">{renderInlineMarkdown(child)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered / Numbered List with nesting: 1. item, 2. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const topItems = [];

      while (i < lines.length) {
        const raw = lines[i];
        const stripped = raw.trimStart();
        const indent = raw.length - stripped.length;
        const isBullet = /^[-*+]\s+/.test(stripped);
        const isNumber = /^\d+\.\s+/.test(stripped);

        if (!isBullet && !isNumber) break;
        if (isBullet && indent <= 1 && topItems.length > 0) break;

        const itemText = isNumber
          ? stripped.replace(/^\d+\.\s+/, '')
          : stripped.replace(/^[-*+]\s+/, '');

        if (indent <= 1) {
          topItems.push({ text: itemText, children: [] });
        } else if (topItems.length > 0) {
          topItems[topItems.length - 1].children.push(itemText);
        } else {
          topItems.push({ text: itemText, children: [] });
        }
        i++;
      }

      elements.push(
        <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {topItems.map((item, lIdx) => (
            <li key={lIdx} className="text-slate-700 text-xs sm:text-sm">
              <div className="flex items-start space-x-2">
                <span className="font-bold text-brand-600 text-xs min-w-5 flex-shrink-0">
                  {lIdx + 1}.
                </span>
                <span className="flex-1">{renderInlineMarkdown(item.text)}</span>
              </div>
              {item.children.length > 0 && (
                <ul className="mt-1 ml-6 space-y-1">
                  {item.children.map((child, cIdx) => (
                    <li key={cIdx} className="flex items-start space-x-2 text-slate-600 text-xs sm:text-sm">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span className="flex-1">{renderInlineMarkdown(child)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Empty line: skip or paragraph break
    if (!trimmed) {
      i++;
      continue;
    }

    // 9. Standard Paragraph (collect consecutive text lines, preserve line breaks)
    const paragraphLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      lines[i].trim() !== '---'
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    elements.push(
      <p key={`p-${elements.length}`} className="my-1.5 text-slate-700 text-xs sm:text-sm leading-relaxed break-words">
        {preserveLineBreaks
          ? paragraphLines.map((pLine, pIdx) => (
              <React.Fragment key={pIdx}>
                {pIdx > 0 && <br />}
                {renderInlineMarkdown(pLine)}
              </React.Fragment>
            ))
          : renderInlineMarkdown(paragraphLines.join(' '))
        }
      </p>
    );
  }

  return (
    <div className={`space-y-1 text-slate-800 break-words ${className}`}>
      {elements}
    </div>
  );
};

export default MarkdownRenderer;

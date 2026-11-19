// Mô tả quán có định dạng đơn giản, viết kiểu Markdown:
//   **đậm**, *nghiêng*, dòng bắt đầu bằng "- " là danh sách chấm, "1. " là danh sách số.
// Không dùng HTML thô: mọi chữ đi qua React nên không chèn được mã độc.

import type { ReactNode } from "react";

type Block = { type: "p"; lines: string[] } | { type: "ul" | "ol"; items: string[] };

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else if (numbered) {
      if (last?.type === "ol") last.items.push(numbered[1]);
      else blocks.push({ type: "ol", items: [numbered[1]] });
    } else if (line.trim() === "") {
      blocks.push({ type: "p", lines: [] }); // dòng trống: ngắt đoạn
    } else if (last?.type === "p" && last.lines.length > 0) {
      last.lines.push(line);
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }
  return blocks.filter((b) => (b.type === "p" ? b.lines.length > 0 : b.items.length > 0));
}

/** "**a** and *b*" → [<strong>a</strong>, " and ", <em>b</em>] */
export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(match[1] !== undefined ? <strong key={key++}>{match[1]}</strong> : <em key={key++}>{match[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {renderInline(line)}
                </span>
              ))}
            </p>
          );
        }
        const items = block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>);
        return block.type === "ul" ? (
          <ul key={i} className="list-disc pl-5">
            {items}
          </ul>
        ) : (
          <ol key={i} className="list-decimal pl-5">
            {items}
          </ol>
        );
      })}
    </div>
  );
}

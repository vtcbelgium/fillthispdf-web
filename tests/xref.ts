// Strict, independent validation of classic PDF xref table entries.
// PDF.js and pdf-lib sometimes recover dangling references silently,
// whereas Adobe Acrobat rejects the document.
export function xrefErrors(bytes: Uint8Array): string[] {
  const pdf = Buffer.from(bytes).toString("latin1");
  const start = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(pdf);
  if (!start) return ["Missing terminal startxref"];
  const offset = Number(start[1]);
  if (pdf.slice(offset, offset + 4) !== "xref") {
    return ["Expected classic xref table at startxref"];
  }
  const trailerAt = pdf.indexOf("trailer", offset + 4);
  if (trailerAt === -1) return ["No trailer after xref"];
  const lines = pdf
    .slice(offset + 4, trailerAt)
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim());
  const errors: string[] = [];
  for (let index = 0; index < lines.length; ) {
    const header = /^(\d+)\s+(\d+)$/.exec(lines[index++]);
    if (!header) return [...errors, "Malformed xref subsection"];
    const [startId, length] = [Number(header[1]), Number(header[2])];
    for (let n = 0; n < length; n++) {
      const entry = /^(\d{10})\s+(\d{5})\s+([nf])\b/.exec(lines[index++] ?? "");
      if (!entry) return [...errors, "Malformed xref entry"];
      if (entry[3] === "f") continue;
      const [objectOffset, generation] = [Number(entry[1]), Number(entry[2])];
      const objectHeader = new RegExp(
        `^${startId + n}\\s+${generation}\\s+obj\\b`,
      );
      if (!objectHeader.test(pdf.slice(objectOffset, objectOffset + 45))) {
        errors.push(`Broken xref: object ${startId + n} generation ${generation}`);
      }
    }
  }
  return errors;
}

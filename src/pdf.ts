import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, degrees, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_PAGES = 50;
export type Edit = { id: string; page: number; x: number; y: number; size: number; text: string; kind: 'text' | 'date' | 'check' | 'signature' };
export type Values = Record<string, string | string[] | boolean>;
export type FormField = { name: string; kind: 'text' | 'check' | 'choice' | 'radio'; options: string[]; multiline: boolean; readOnly: boolean; maxLength?: number };
export type Widget = { name: string; rect: number[]; option?: string };
export type PageInfo = { width: number; height: number; rotation: number; viewport: pdfjs.PageViewport; widgets: Widget[] };
export type LoadedPdf = { bytes: Uint8Array; viewer: pdfjs.PDFDocumentProxy; destroy: () => Promise<void>; pages: PageInfo[]; fields: FormField[]; values: Values; unsupported: number; font: Uint8Array };
export class PdfError extends Error { constructor(public code: 'file' | 'size' | 'pages' | 'password' | 'invalid' | 'font' | 'xfa') { super(code); } }

export function validateFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (!/\.pdf$/i.test(file.name) || (file.type && !['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(file.type))) throw new PdfError('file');
  if (!file.size) throw new PdfError('invalid');
  if (file.size > MAX_BYTES) throw new PdfError('size');
}

export async function loadPdf(bytes: Uint8Array, font: Uint8Array): Promise<LoadedPdf> {
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(bytes); } catch (e) { throw new PdfError(String(e).includes('encrypted') ? 'password' : 'invalid'); }
  if (!doc.getPageCount()) throw new PdfError('invalid');
  if (doc.getPageCount() > MAX_PAGES) throw new PdfError('pages');
  if (doc.getForm().hasXFA()) throw new PdfError('xfa');
  const fields: FormField[] = [], values: Values = {};
  let unsupported = 0;
  for (const f of doc.getForm().getFields()) {
    const common = { name: f.getName(), readOnly: f.isReadOnly(), multiline: false, options: [] as string[] };
    if (f instanceof PDFTextField) { fields.push({ ...common, kind: 'text', multiline: f.isMultiline(), maxLength: f.getMaxLength() }); values[f.getName()] = f.getText() || ''; }
    else if (f instanceof PDFCheckBox) { fields.push({ ...common, kind: 'check' }); values[f.getName()] = f.isChecked(); }
    else if (f instanceof PDFDropdown || f instanceof PDFOptionList) { fields.push({ ...common, kind: 'choice', options: f.getOptions() }); values[f.getName()] = f.getSelected(); }
    else if (f instanceof PDFRadioGroup) { fields.push({ ...common, kind: 'radio', options: f.getOptions() }); values[f.getName()] = f.getSelected() || ''; }
    else unsupported++;
  }
  const task = pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true, enableXfa: false });
  let viewer: pdfjs.PDFDocumentProxy;
  try { viewer = await task.promise; } catch (e) { await task.destroy(); throw new PdfError(e instanceof Error && e.name === 'PasswordException' ? 'password' : 'invalid'); }
  try {
    const pages: PageInfo[] = [];
    for (let n = 1; n <= viewer.numPages; n++) {
      const page = await viewer.getPage(n), viewport = page.getViewport({ scale: 1 });
      if (viewport.width > 14400 || viewport.height > 14400 || viewport.width < 1 || viewport.height < 1) throw new PdfError('size');
      const annotations = await page.getAnnotations();
      const widgets = annotations.filter(a => a.subtype === 'Widget' && fields.some(f => f.name === a.fieldName)).map(a => {
        const r = [...viewport.convertToViewportPoint(a.rect[0], a.rect[1]), ...viewport.convertToViewportPoint(a.rect[2], a.rect[3])];
        return { name: a.fieldName as string, rect: [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.abs(r[2] - r[0]), Math.abs(r[3] - r[1])], option: a.buttonValue as string | undefined };
      });
      pages.push({ width: viewport.width, height: viewport.height, rotation: viewport.rotation, viewport, widgets });
    }
    return { bytes, viewer, destroy: () => task.destroy(), pages, fields, values, unsupported, font };
  } catch (e) { await task.destroy(); throw e; }
}

export function pdfPoint(page: PageInfo, x: number, y: number) { return page.viewport.convertToPdfPoint(x, y); }
export async function exportPdf(source: LoadedPdf, edits: Edit[], values: Values) {
  const doc = await PDFDocument.load(source.bytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(source.font, { subset: true });
  const supported = new Set(font.getCharacterSet());
  for (const text of [...edits.filter(e => e.kind !== 'check').map(e => e.text), ...Object.values(values).flatMap(v => typeof v === 'string' ? [v] : Array.isArray(v) ? v : [])]) {
    if ([...text].some(c => c !== '\n' && c !== '\r' && !supported.has(c.codePointAt(0)!))) throw new PdfError('font');
  }
  const form = doc.getForm();
  for (const field of source.fields) {
    if (field.readOnly || JSON.stringify(values[field.name]) === JSON.stringify(source.values[field.name])) continue;
    const f = form.getField(field.name), value = values[field.name];
    if (f instanceof PDFTextField) { f.setText(String(value)); f.updateAppearances(font); }
    else if (f instanceof PDFCheckBox) { if (value) f.check(); else f.uncheck(); }
    else if (f instanceof PDFDropdown || f instanceof PDFOptionList) { if (!value || (Array.isArray(value) && !value.length)) f.clear(); else f.select(value as string | string[]); f.updateAppearances(font); }
    else if (f instanceof PDFRadioGroup) { if (value) f.select(String(value)); else f.clear(); }
  }
  for (const edit of edits) {
    const page = doc.getPage(edit.page), info = source.pages[edit.page];
    if (edit.kind === 'check') {
      const points = [[0.12, 0.52], [0.4, 0.8], [0.92, 0.15]].map(([x, y]) => pdfPoint(info, edit.x + x * edit.size, edit.y + y * edit.size));
      for (let i = 1; i < points.length; i++) page.drawLine({ start: { x: points[i-1][0], y: points[i-1][1] }, end: { x: points[i][0], y: points[i][1] }, thickness: edit.size * 0.1, color: rgb(0.08, 0.12, 0.18) });
    } else {
      const [x, y] = pdfPoint(info, edit.x, edit.y + edit.size);
      page.drawText(edit.text, { x, y, font, size: edit.size, lineHeight: edit.size * 1.35, rotate: degrees(info.rotation), color: rgb(0.08, 0.12, 0.18) });
    }
  }
  return doc.save({ updateFieldAppearances: false });
}

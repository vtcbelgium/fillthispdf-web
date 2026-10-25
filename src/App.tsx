import { useEffect, useRef, useState } from 'react';
import { exportPdf, loadPdf, PdfError, validateFile, type Edit, type LoadedPdf, type Values } from './pdf';
import { languages, type Language } from './i18n';
import { Page } from './Page';
import { FieldControl } from './Fields';

type State = { edits: Edit[]; values: Values };
type History = { past: State[]; current: State; future: State[] };
const empty = (): History => ({ past: [], current: { edits: [], values: {} }, future: [] });
export default function App() {
  const [lang, setLang] = useState<Language>(() => navigator.language.startsWith('nl') ? 'nl' : navigator.language.startsWith('fr') ? 'fr' : 'en');
  const t = languages[lang];
  const [pdf, setPdf] = useState<LoadedPdf | null>(null), [filename, setFilename] = useState('');
  const [history, setHistory] = useState<History>(empty), [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<Edit['kind'] | 'select'>('text'), [text, setText] = useState(''), [size, setSize] = useState(14);
  const [busy, setBusy] = useState<'load' | 'save' | null>(null), [error, setError] = useState(''), [success, setSuccess] = useState(false), [dropping, setDropping] = useState(false);
  const [zoom, setZoom] = useState(1), [available, setAvailable] = useState(800), [page, setPage] = useState(1);
  const input = useRef<HTMLInputElement>(null), workspace = useRef<HTMLDivElement>(null), editor = useRef<HTMLTextAreaElement>(null);
  const working = useRef(false);
  const { edits, values } = history.current;
  const selection = edits.find(e => e.id === selected);
  function change(next: State) { setHistory(h => ({ past: [...h.past.slice(-99), h.current], current: next, future: [] })); setSuccess(false); }
  function undo() { setHistory(h => h.past.length ? { past: h.past.slice(0, -1), current: h.past[h.past.length - 1], future: [h.current, ...h.future] } : h); setSuccess(false); }
  function redo() { setHistory(h => h.future.length ? { past: [...h.past, h.current], current: h.future[0], future: h.future.slice(1) } : h); setSuccess(false); }
  function updateEdit(patch: Partial<Edit>) { if (selection) change({ ...history.current, edits: edits.map(e => e.id === selected ? { ...e, ...patch } : e) }); }
  function field(name: string, value: Values[string]) { change({ ...history.current, values: { ...values, [name]: value } }); }
  const dirty = history.past.length > 0 || edits.length > 0;
  useEffect(() => { document.documentElement.lang = lang; document.title = `FillThisPDF — ${t.title}`; document.querySelector('meta[name="description"]')?.setAttribute('content', t.intro); }, [lang, t]);
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  useEffect(() => { if (!workspace.current) return; const obs = new ResizeObserver(entries => setAvailable(Math.max(180, entries[0].contentRect.width - 32))); obs.observe(workspace.current); return () => obs.disconnect(); }, [pdf]);
  useEffect(() => () => { void pdf?.destroy(); }, [pdf]);
  function message(e: unknown, fallback: string) { if (!(e instanceof PdfError)) return fallback; return ({ file: t.file, size: t.sizeError, pages: t.pagesError, password: t.password, invalid: t.invalid, font: t.font, xfa: t.xfa })[e.code]; }
  async function open(file?: File) {
    if (!file || working.current) return; working.current = true; setBusy('load'); setError(''); setSuccess(false);
    try {
      validateFile(file);
      const response = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSans-Regular.ttf`); if (!response.ok) throw new Error(t.fontLoad);
      const loaded = await loadPdf(new Uint8Array(await file.arrayBuffer()), new Uint8Array(await response.arrayBuffer()));
      setPdf(loaded); setFilename(file.name); setHistory({ past: [], current: { edits: [], values: loaded.values }, future: [] }); setSelected(null); setZoom(1); setPage(1); setText('');
    } catch (e) { setError(message(e, e instanceof Error && e.message === t.fontLoad ? t.fontLoad : t.invalid)); }
    finally { working.current = false; setBusy(null); if (input.current) input.current.value = ''; }
  }
  async function download() {
    if (!pdf || working.current) return; working.current = true; setBusy('save'); setError('');
    try { const bytes = await exportPdf(pdf, edits, values); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })); const a = document.createElement('a'); a.href = url; a.download = filename.replace(/\.pdf$/i, '') + '-filled.pdf'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); setSuccess(true); }
    catch (e) { setError(message(e, t.exportError)); } finally { working.current = false; setBusy(null); }
  }
  function place(index: number, x: number, y: number) {
    if (tool === 'select' || !pdf) { setSelected(null); return; }
    const id = crypto.randomUUID(), actualSize = tool === 'signature' ? Math.max(size, 24) : size;
    const edit: Edit = { id, page: index, kind: tool, x: Math.max(0, Math.min(x, pdf.pages[index].width - actualSize)), y: Math.max(0, Math.min(y, pdf.pages[index].height - actualSize * 1.35)), size: actualSize, text: tool === 'date' ? new Intl.DateTimeFormat(lang).format(new Date()) : tool === 'check' ? '' : text || t.content };
    change({ ...history.current, edits: [...edits, edit] }); setSelected(id); setTool('select'); if (tool !== 'check') setTimeout(() => { editor.current?.focus(); editor.current?.select(); }, 0);
  }
  function move(id: string, x: number, y: number) { if (!pdf) return; change({ ...history.current, edits: edits.map(e => e.id === id ? { ...e, x: Math.max(0, Math.min(x, pdf.pages[e.page].width - e.size)), y: Math.max(0, Math.min(y, pdf.pages[e.page].height - e.size * 1.35)) } : e) }); }
  function go(n: number) { setPage(n); document.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  return <>
    <header><a className="brand" href="./" onClick={e => { if (pdf) e.preventDefault(); }}><span className="brand-icon">✓</span>FillThis<span>PDF</span></a><div className="header-right"><span className="privacy-mini">◉ {t.local}</span><select aria-label={t.language} value={lang} onChange={e => setLang(e.target.value as Language)}><option value="en">English</option><option value="nl">Nederlands</option><option value="fr">Français</option></select></div></header>
    <main>
      {error && <div className="notice error" role="alert">{error}<button aria-label={t.deselect} onClick={() => setError('')}>×</button></div>}
      {busy && <div className="notice" role="status"><span className="spinner"/>{busy === 'load' ? t.loading : t.saving}</div>}
      {!pdf ? <>
        <section className="hero"><p className="eyebrow">{t.eyebrow}</p><h1>{t.hero}<br/><em>{t.heroEnd}</em></h1><p className="intro">{t.intro}</p>
          <div className={`dropzone ${dropping ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={e => { e.preventDefault(); setDropping(false); void open(e.dataTransfer.files[0]); }}>
            <div className="paper-icon" aria-hidden="true"><span>PDF</span><i>＋</i></div><button className="primary upload" disabled={!!busy} onClick={() => input.current?.click()}>{t.choose} <span aria-hidden="true">↗</span></button><p>{t.drop}</p><small>{t.limits}</small>
          </div><p className="local-line">✓ {t.local}</p>
        </section>
        <section className="benefits">{[[t.privacy, t.privacyBody, '01'], [t.free, t.freeBody, '02'], [t.flat, t.flatBody, '03']].map(([title, body, num]) => <article key={num}><span>{num}</span><h2>{title}</h2><p>{body}</p></article>)}</section>
      </> : <section className="editor-shell" aria-label={filename}>
        <div className="document-header"><div><p className="eyebrow">{t.local}</p><h1 title={filename}>{filename}</h1><span>{pdf.pages.length} {t.page.toLowerCase()} · {(pdf.bytes.length / 1024 / 1024).toFixed(1)} MB</span></div><div className="document-actions"><button disabled={!!busy} onClick={() => { if (!dirty || window.confirm(t.closeConfirm)) { setPdf(null); setHistory(empty()); setError(''); setSuccess(false); } }}>{t.close}</button><button className="primary" disabled={!!busy} onClick={() => void download()}>{t.download} ↓</button></div></div>
        {success && <div className="notice success" role="status"><div><strong>{t.success}</strong><p>{t.successHint}</p></div></div>}
        <fieldset className="editing-controls" disabled={!!busy}><legend className="sr-only">{t.tools}</legend>
          <div className="toolbar" role="toolbar" aria-label={t.tools}>{(['select', 'text', 'date', 'check', 'signature'] as const).map((v, i) => <button key={v} className={tool === v ? 'active' : ''} aria-pressed={tool === v} onClick={() => { setTool(v); setSelected(null); }}><span aria-hidden="true">{['↖', 'T', '▦', '✓', '✎'][i]}</span>{t[v]}</button>)}<span className="toolbar-spacer"/><button onClick={undo} disabled={!history.past.length} title={t.undo} aria-label={t.undo}>↶</button><button onClick={redo} disabled={!history.future.length} title={t.redo} aria-label={t.redo}>↷</button></div>
          <div className="edit-panel"><label className="text-label">{t.content}<textarea ref={editor} rows={2} disabled={selection?.kind === 'check' || tool === 'check'} value={selection ? selection.text : text} placeholder={t.content} onChange={e => selection ? updateEdit({ text: e.target.value }) : setText(e.target.value)}/></label><label>{t.size}<input aria-label={t.size} type="number" min="6" max="96" value={selection?.size || size} onChange={e => { const n = Math.max(6, Math.min(96, Number(e.target.value) || 14)); if (selection) updateEdit({ size: n }); else setSize(n); }}/></label>{selection && <><button onClick={() => { change({ ...history.current, edits: edits.filter(e => e.id !== selected) }); setSelected(null); }}>{t.delete}</button><button onClick={() => setSelected(null)}>{t.deselect}</button></>}</div>
          <p className="editor-hint">{tool === 'signature' || selection?.kind === 'signature' ? t.signatureHint : t.hint}</p>
        </fieldset>
        <div className="workspace-layout"><aside><details open={pdf.fields.length > 0}><summary>{t.fields} <span>{pdf.fields.length}</span></summary><p>{pdf.fields.length ? t.fieldsHint : t.noFields}</p>{pdf.fields.map(f => <label className="field-label" key={f.name}>{f.name}{f.readOnly && <small>{t.readOnly}</small>}<FieldControl field={f} value={values[f.name]} onChange={v => field(f.name, v)} t={t}/></label>)}{pdf.unsupported > 0 && <p className="notice">{t.unsupported}</p>}</details></aside>
          <div className="workspace" ref={workspace}><div className="page-controls"><button aria-label={t.previous} disabled={page === 1} onClick={() => go(page - 1)}>‹</button><label>{t.page} <select aria-label={t.page} value={page} onChange={e => go(Number(e.target.value))}>{pdf.pages.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> {t.of} {pdf.pages.length}</label><button aria-label={t.next} disabled={page === pdf.pages.length} onClick={() => go(page + 1)}>›</button><span className="toolbar-spacer"/><button aria-label={t.zoomOut} disabled={zoom <= .5} onClick={() => setZoom(z => Math.max(.5, z - .25))}>−</button><span aria-label={t.zoom}>{Math.round(zoom * 100)}%</span><button aria-label={t.zoomIn} disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .25))}>+</button><button onClick={() => setZoom(1)}>{t.fit}</button></div>
            <div className="pages">{pdf.pages.map((info, index) => <div className="page-wrap" key={index}><p>{t.page} {index + 1} {t.of} {pdf.pages.length}</p><Page pdf={pdf} index={index} scale={Math.min(1.25, available / info.width) * zoom} edits={edits.filter(e => e.page === index)} selected={selected} values={values} onPlace={(x, y) => place(index, x, y)} onSelect={id => { setSelected(id); setTool('select'); }} onMove={move} onField={field} t={t}/></div>)}</div>
          </div></div>
      </section>}
      <input className="sr-only" ref={input} type="file" accept=".pdf,application/pdf" aria-label={t.choose} onChange={e => void open(e.target.files?.[0])}/>
      <details className="ai-panel"><summary>{t.ai}<span>{t.aiUnavailable}</span></summary><p>{t.aiBody}</p><button disabled>{t.aiUnavailable}</button></details>
      <section className="faq"><div><p className="eyebrow">FILLTHISPDF</p><h2>{t.faq}</h2></div><div>{[[t.q1, t.a1], [t.q2, t.a2], [t.q3, t.a3], [t.q4, t.a4]].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      {pdf && <p className="privacy-footer">{t.privacyBody}</p>}
    </main><footer><strong>{t.footer}</strong><p>{t.terms}</p><span>© {new Date().getFullYear()} FillThisPDF</span></footer>
  </>;
}

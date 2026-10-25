import { useEffect, useRef, useState } from "react";
// PDF.js AnnotationMode.ENABLE = 1. Keep its renderer out of the initial page bundle.
const ANNOTATIONS_ENABLE = 1;
import type { Edit, LoadedPdf, Values } from "./pdf";
import type { Messages } from "./i18n";
import { FieldControl } from "./Fields";

export function Page({
  pdf,
  index,
  scale,
  edits,
  selected,
  values,
  onPlace,
  onSelect,
  onMove,
  onField,
  t,
}: {
  pdf: LoadedPdf;
  index: number;
  scale: number;
  edits: Edit[];
  selected: string | null;
  values: Values;
  onPlace: (x: number, y: number) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onField: (name: string, v: Values[string]) => void;
  t: Messages;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    root = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false),
    [failed, setFailed] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const start = useRef<{
    id: string;
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const info = pdf.pages[index];
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setNear(entries[0].isIntersecting),
      { rootMargin: "800px" },
    );
    observer.observe(root.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!near) {
      if (canvas.current) {
        canvas.current.width = 0;
        canvas.current.height = 0;
      }
      return;
    }
    let stopped = false;
    let render:
      | ReturnType<Awaited<ReturnType<typeof pdf.viewer.getPage>>["render"]>
      | undefined;
    void pdf.viewer
      .getPage(index + 1)
      .then((page) => {
        if (stopped || !canvas.current) return;
        const density = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(12_000_000 / (info.width * info.height * scale * scale)),
        );
        const viewport = page.getViewport({ scale: scale * density });
        const el = canvas.current;
        el.width = Math.floor(viewport.width);
        el.height = Math.floor(viewport.height);
        render = page.render({
          canvas: el,
          viewport,
          annotationMode: ANNOTATIONS_ENABLE,
        });
        return render.promise;
      })
      .catch((e) => {
        if (!stopped && e.name !== "RenderingCancelledException")
          setFailed(true);
      });
    return () => {
      stopped = true;
      render?.cancel();
    };
  }, [pdf, index, scale, near, info.width, info.height]);
  return (
    <div
      className="page"
      ref={root}
      data-page={index + 1}
      style={{ width: info.width * scale, height: info.height * scale }}
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target === canvas.current) {
          const r = e.currentTarget.getBoundingClientRect();
          onPlace((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
        }
      }}
    >
      <canvas
        ref={canvas}
        aria-label={`${t.page} ${index + 1}`}
        style={{ width: "100%", height: "100%" }}
      />
      {failed && (
        <div className="page-error" role="alert">
          {t.renderError}
        </div>
      )}
      {info.widgets.map((w, i) => {
        const field = pdf.fields.find((f) => f.name === w.name)!;
        return (
          <div
            className="widget"
            key={`${w.name}-${i}`}
            style={{
              left: w.rect[0] * scale,
              top: w.rect[1] * scale,
              width: w.rect[2] * scale,
              height: w.rect[3] * scale,
              fontSize: Math.max(8, Math.min(14, w.rect[3] * 0.65)) * scale,
            }}
          >
            <FieldControl
              field={field}
              value={values[w.name]}
              option={w.option}
              onChange={(v) => onField(w.name, v)}
              t={t}
            />
          </div>
        );
      })}
      {edits.map((edit) => {
        const active = selected === edit.id,
          position = drag?.id === edit.id ? drag : edit;
        const lines = edit.text.split("\n"),
          width =
            edit.kind === "check"
              ? edit.size
              : Math.max(
                  edit.size,
                  ...lines.map((line) => line.length * edit.size * 0.85),
                );
        return (
          <div
            key={edit.id}
            role="button"
            tabIndex={0}
            aria-label={`${t[edit.kind]}: ${edit.text}`}
            aria-pressed={active}
            className={`overlay ${active ? "selected" : ""}`}
            style={{
              left: position.x * scale,
              top: position.y * scale,
              width: width * scale,
              height: edit.size * (1.35 * (lines.length - 1) + 1.35) * scale,
              touchAction: "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(edit.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(edit.id);
              }
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                const d = e.shiftKey ? 10 : 1;
                onMove(
                  edit.id,
                  edit.x +
                    (e.key === "ArrowRight"
                      ? d
                      : e.key === "ArrowLeft"
                        ? -d
                        : 0),
                  edit.y +
                    (e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0),
                );
              }
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(edit.id);
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = {
                id: edit.id,
                x: edit.x,
                y: edit.y,
                clientX: e.clientX,
                clientY: e.clientY,
              };
            }}
            onPointerMove={(e) => {
              if (start.current?.id === edit.id)
                setDrag({
                  id: edit.id,
                  x: Math.max(
                    0,
                    Math.min(
                      info.width - edit.size,
                      start.current.x +
                        (e.clientX - start.current.clientX) / scale,
                    ),
                  ),
                  y: Math.max(
                    0,
                    Math.min(
                      info.height - edit.size,
                      start.current.y +
                        (e.clientY - start.current.clientY) / scale,
                    ),
                  ),
                });
            }}
            onPointerUp={() => {
              if (drag?.id === edit.id) onMove(edit.id, drag.x, drag.y);
              start.current = null;
              setDrag(null);
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag(null);
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${edit.size * (1.35 * (lines.length - 1) + 1.35)}`}
              overflow="visible"
              aria-hidden="true"
            >
              {edit.kind === "check" ? (
                <path
                  d={`M ${edit.size * 0.12} ${edit.size * 0.52} L ${edit.size * 0.4} ${edit.size * 0.8} L ${edit.size * 0.92} ${edit.size * 0.15}`}
                  fill="none"
                  stroke="#141f2e"
                  strokeWidth={edit.size * 0.1}
                />
              ) : (
                <text
                  fontFamily="Noto Sans"
                  fontSize={edit.size}
                  fill="#141f2e"
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x="0" y={edit.size + i * edit.size * 1.35}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

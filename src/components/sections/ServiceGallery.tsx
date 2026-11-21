"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceImage } from "@/content/site";

/**
 * Service photos: a thumbnail on the card that opens a full-screen viewer with
 * next/previous, thumbnails, zoom (click or button) with drag-to-pan, swipe and keyboard support.
 */
export function ServiceGallery({ title, images }: { title: string; images: ServiceImage[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const first = images[0];
  if (!first) return null;
  const many = images.length > 1;

  return (
    <>
      <button
        type="button"
        className={`gallery-thumb${first.contain ? " gallery-thumb--doc" : ""}${many ? " gallery-thumb--stack" : ""}`}
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        aria-label={`View ${many ? `${images.length} images` : "image"} for ${title}`}
        aria-haspopup="dialog"
      >
        <span className="gallery-thumb__frame" data-reveal="clip">
          <Image src={first.src} alt={first.alt} fill sizes="(max-width: 699px) 100vw, (max-width: 1023px) 200px, 220px" />
        </span>
        <span className="gallery-thumb__hover" aria-hidden="true">
          <ExpandIcon />
          View
        </span>
        {many ? (
          <span className="gallery-thumb__count mono" aria-hidden="true">
            <StackIcon /> {images.length}
          </span>
        ) : null}
      </button>
      {open ? <Lightbox title={title} images={images} index={index} onIndex={setIndex} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const MAX_ZOOM = 4;

function Lightbox({
  title,
  images,
  index,
  onIndex,
  onClose,
}: {
  title: string;
  images: ServiceImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dir, setDir] = useState<"next" | "prev" | "none">("none");
  // Where a press started. Pointer capture retargets later events to the stage, so remember the original target.
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean; id: number; onImage: boolean } | null>(null);
  const many = images.length > 1;
  const current = images[index];

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (step: 1 | -1) => {
      if (!many) return;
      setDir(step === 1 ? "next" : "prev");
      resetZoom();
      onIndex((index + step + images.length) % images.length);
    },
    [many, index, images.length, onIndex, resetZoom],
  );

  // Open as a modal: focus is trapped, the page behind is inert, and scrolling is locked.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    document.documentElement.classList.add("lightbox-open");
    return () => {
      document.documentElement.classList.remove("lightbox-open");
      if (d.open) d.close();
    };
  }, []);

  // Preload the neighbours so next/previous feel instant.
  useEffect(() => {
    if (!many) return;
    for (const i of [index + 1, index - 1]) {
      const n = images[(i + images.length) % images.length];
      const pre = new window.Image();
      pre.src = n.src;
    }
  }, [index, images, many]);

  /** How far the image can move before an edge comes into view. */
  const clampPan = useCallback((x: number, y: number, z: number) => {
    const el = img.current;
    if (!el) return { x, y };
    const maxX = Math.max(0, (el.offsetWidth * z - el.offsetWidth) / 2);
    const maxY = Math.max(0, (el.offsetHeight * z - el.offsetHeight) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, []);

  /** Zoom so the point under (clientX, clientY) stays put. */
  const zoomAt = useCallback(
    (clientX?: number, clientY?: number) => {
      const el = img.current;
      if (!el) return;
      if (zoom > 1) return resetZoom();
      // Zoom to the photo's real resolution (at least 2x), capped.
      const natural = el.naturalWidth / Math.max(1, el.offsetWidth);
      const z = Math.min(MAX_ZOOM, Math.max(2, natural));
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (clientX ?? cx) - cx;
      const dy = (clientY ?? cy) - cy;
      setZoom(z);
      setPan(clampPan(dx * (1 - z), dy * (1 - z), z));
    },
    [zoom, resetZoom, clampPan],
  );

  // Keyboard: arrows to navigate, +/-/0 for zoom, Esc unzooms first, then closes.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if ((e.key === "+" || e.key === "=") && zoom === 1) zoomAt();
      else if ((e.key === "-" || e.key === "0") && zoom > 1) resetZoom();
      else return;
      e.preventDefault();
    };
    const onCancel = (e: Event) => {
      if (zoom > 1) {
        e.preventDefault();
        resetZoom();
      }
    };
    d.addEventListener("keydown", onKey);
    d.addEventListener("cancel", onCancel);
    d.addEventListener("close", onClose);
    return () => {
      d.removeEventListener("keydown", onKey);
      d.removeEventListener("cancel", onCancel);
      d.removeEventListener("close", onClose);
    };
  }, [go, zoom, zoomAt, resetZoom, onClose]);

  // Pointer: drag to pan when zoomed, swipe to change image when not, click to toggle zoom.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, a")) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false, id: e.pointerId, onImage: e.target === img.current };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (zoom > 1) setPan(clampPan(d.px + dx, d.py + dy, zoom));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (d.onImage) zoomAt(e.clientX, e.clientY);
      else if (zoom === 1) dialog.current?.close(); // tap on the dark area around the photo closes
      return;
    }
    if (zoom === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - d.y)) go(dx < 0 ? 1 : -1);
  };

  const onBackdropClick = (e: React.MouseEvent) => {
    // Clicks on the dialog's own background (outside bar, stage and footer content) close it.
    if (e.target === e.currentTarget && zoom === 1) dialog.current?.close();
  };

  return (
    <dialog ref={dialog} className="lightbox" aria-label={`${title}: images`} onClick={onBackdropClick}>
      <div className="lightbox__bar">
        <p className="lightbox__title">
          <span className="mono">{title}</span>
          {many ? (
            <span className="mono lightbox__count" aria-live="polite">
              {index + 1} / {images.length}
            </span>
          ) : null}
        </p>
        <div className="lightbox__tools">
          <button type="button" className="lightbox__btn" onClick={() => zoomAt()} aria-pressed={zoom > 1} aria-label={zoom > 1 ? "Zoom out" : "Zoom in"} title={zoom > 1 ? "Zoom out (−)" : "Zoom in (+)"}>
            {zoom > 1 ? <ZoomOutIcon /> : <ZoomInIcon />}
          </button>
          <a className="lightbox__btn" href={current.src} target="_blank" rel="noopener noreferrer" aria-label="Open full-size image in a new tab" title="Open full size">
            <ExternalIcon />
          </a>
          <button type="button" className="lightbox__btn" onClick={() => dialog.current?.close()} aria-label="Close" title="Close (Esc)" autoFocus>
            <CloseIcon />
          </button>
        </div>
      </div>

      <div
        ref={stage}
        className={`lightbox__stage${zoom > 1 ? " is-zoomed" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <figure key={current.src} className={`lightbox__figure lightbox__figure--${dir}`}>
          {/* Plain <img> so the viewer always shows the original, full-resolution file for zooming. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={img}
            src={current.src}
            alt={current.alt}
            width={current.width}
            height={current.height}
            className={`lightbox__img${current.contain ? " lightbox__img--doc" : ""}`}
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
            draggable={false}
            decoding="async"
          />
        </figure>
        {many ? (
          <>
            <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Previous image">
              <ChevronIcon />
            </button>
            <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Next image">
              <ChevronIcon />
            </button>
          </>
        ) : null}
      </div>

      <div className="lightbox__foot">
        <p className="lightbox__caption">{current.caption}</p>
        {many ? (
          <ol className="lightbox__thumbs" aria-label="All images">
            {images.map((im, i) => (
              <li key={im.src}>
                <button
                  type="button"
                  className={`lightbox__thumb${im.contain ? " lightbox__thumb--doc" : ""}`}
                  aria-current={i === index ? "true" : undefined}
                  aria-label={`Image ${i + 1}: ${im.caption}`}
                  onClick={() => {
                    if (i === index) return;
                    setDir(i > index ? "next" : "prev");
                    resetZoom();
                    onIndex(i);
                  }}
                >
                  <Image src={im.src} alt="" fill sizes="96px" />
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </dialog>
  );
}

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true } as const;
const ExpandIcon = () => (
  <svg {...icon}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
const StackIcon = () => (
  <svg {...icon} width={13} height={13}>
    <rect x="3" y="7" width="14" height="14" />
    <path d="M7 3h14v14" />
  </svg>
);
const ZoomInIcon = () => (
  <svg {...icon}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4M11 8v6M8 11h6" />
  </svg>
);
const ZoomOutIcon = () => (
  <svg {...icon}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4M8 11h6" />
  </svg>
);
const ExternalIcon = () => (
  <svg {...icon}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
  </svg>
);
const CloseIcon = () => (
  <svg {...icon}>
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
const ChevronIcon = () => (
  <svg {...icon} width={22} height={22}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

import { useEffect, useRef, useState } from 'react';
import { renderPageToCanvas } from '../pdfEngine';
import type { VirtualPage, PDFSourceFile } from '../types';
import { t, type Lang } from '../i18n';

interface Props {
  pages: VirtualPage[];
  sourceFiles: PDFSourceFile[];
  initialIndex: number;
  lang: Lang;
  onClose: () => void;
  onJump: (index: number) => void;
}

export default function SinglePageView({ pages, sourceFiles, initialIndex, lang, onClose, onJump }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const page = pages[index];
  const sourceFile = page ? sourceFiles.find(f => f.id === page.sourceId) : undefined;

  useEffect(() => {
    if (!page || page.isBlank) return;
    if (!canvasRef.current) return;
    let cancelled = false;
    (async () => {
      // Determine optimal scale based on viewport
      const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth;
      const containerHeight = (containerRef.current?.clientHeight ?? window.innerHeight) - 80;
      // base scale for pdfjs (pdf points -> pixels), plus user zoom
      const baseScale = Math.min(containerWidth / 595, containerHeight / 842);
      const finalScale = Math.max(0.5, baseScale * scale * (window.devicePixelRatio || 1));
      
      if (cancelled || !canvasRef.current) return;
      await renderPageToCanvas(
        canvasRef.current,
        page.sourceId,
        page.sourcePageIndex,
        finalScale,
        `zoom_${page.id}_${scale}`
      );
      // Style the canvas so it fits visually (regardless of devicePixelRatio)
      if (canvasRef.current) {
        canvasRef.current.style.width = (canvasRef.current.width / (window.devicePixelRatio || 1)) + 'px';
        canvasRef.current.style.height = (canvasRef.current.height / (window.devicePixelRatio || 1)) + 'px';
      }
    })();
    return () => { cancelled = true; };
  }, [page?.id, scale]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setIndex(i => Math.min(pages.length - 1, i + 1));
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(4, s + 0.25));
      } else if (e.key === '-') {
        setScale(s => Math.max(0.25, s - 0.25));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pages.length, onClose]);

  // Touch swipe nav (for mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartX.current;
    const dy = endY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        setIndex(i => Math.max(0, i - 1));
      } else {
        setIndex(i => Math.min(pages.length - 1, i + 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(pages.length - 1, i + 1));

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex flex-col" onClick={onClose}>
      {/* Top toolbar */}
      <div
        className="flex items-center justify-between p-2 bg-gray-900 text-white text-sm flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="font-medium flex-shrink-0">{index + 1} / {pages.length}</span>
          {sourceFile && (
            <span className="text-xs text-gray-300 overflow-x-auto whitespace-nowrap scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {sourceFile.name} :p.{page.sourcePageIndex + 1}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="px-2 py-1 hover:bg-gray-700 rounded">−</button>
          <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(4, s + 0.25))} className="px-2 py-1 hover:bg-gray-700 rounded">+</button>
          <button onClick={() => setScale(1.5)} className="px-2 py-1 hover:bg-gray-700 rounded text-xs">{t('fitWidth', lang)}</button>
          <button
            onClick={() => { onJump(index); onClose(); }}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
            title={t('jumpTo', lang)}
          >
            ⇱
          </button>
          <button onClick={onClose} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded">✕</button>
        </div>
      </div>

      {/* Page content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center relative"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {page?.isBlank ? (
          <div className="bg-white" style={{ width: 595 * scale, height: 842 * scale }}>
            <div className="flex items-center justify-center h-full text-gray-400">
              {t('blankPage', lang)}
            </div>
          </div>
        ) : (
          <canvas ref={canvasRef} className="bg-white shadow-xl" />
        )}

        {/* Prev/Next buttons (large for touch) */}
        {index > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl"
            title={t('prevPage', lang)}
          >
            ‹
          </button>
        )}
        {index < pages.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl"
            title={t('nextPage', lang)}
          >
            ›
          </button>
        )}
      </div>

      {/* Bottom hint */}
      <div className="text-center text-xs text-gray-400 py-1 bg-gray-900 flex-shrink-0">
        {t('swipeHint', lang)} · ← → · +/−
      </div>
    </div>
  );
}

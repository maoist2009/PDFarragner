import React, { useEffect, useRef, useState, memo } from 'react';
import { renderPageToCanvas } from '../pdfEngine';
import type { VirtualPage, PDFSourceFile } from '../types';
import { t, type Lang } from '../i18n';

interface Props {
  page: VirtualPage;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  hasSplitAfter: boolean;
  sourceFile?: PDFSourceFile;
  lang: Lang;
  quality: number;
  onClick: (index: number, e: React.MouseEvent) => void;
  onDoubleClick: (index: number) => void;
  onSplitToggle: (index: number) => void;
  onContextMenu: (index: number, e: React.MouseEvent) => void;
}

const THUMB_WIDTH = 140;

const PageThumbnail = memo(function PageThumbnail({
  page, index, isSelected, isFocused, hasSplitAfter,
  sourceFile, lang, quality, onClick, onDoubleClick, onSplitToggle, onContextMenu
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !rendered) {
          renderThumb();
        }
      },
      { rootMargin: '200px' }
    );
    
    observerRef.current.observe(containerRef.current);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [page.sourceId, page.sourcePageIndex, page.isBlank, quality]);

  const renderThumb = async () => {
    if (page.isBlank) {
      setRendered(true);
      return;
    }
    if (!canvasRef.current) return;
    
    const scale = (THUMB_WIDTH / 595) * quality; // approximate A4 width
    await renderPageToCanvas(
      canvasRef.current,
      page.sourceId,
      page.sourcePageIndex,
      scale,
      `thumb_${page.id}`
    );
    setRendered(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    onClick(index, e);
  };

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(index, e);
  };

  // Long press for mobile
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      onContextMenu(index, e as any);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="relative flex flex-col items-center" ref={containerRef}>
      <div
        className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-150
          ${isSelected ? 'ring-3 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'hover:ring-2 hover:ring-gray-400'}
          ${isFocused ? 'ring-3 ring-orange-400' : ''}
        `}
        onClick={handleClick}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(index); }}
        onContextMenu={handleContext}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {page.isBlank ? (
          <div
            className="bg-white dark:bg-gray-200 border border-gray-300 flex items-center justify-center"
            style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * 1.414 }}
          >
            <span className="text-gray-400 text-xs">{t('blankPage', lang)}</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="bg-white"
            style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * 1.414, objectFit: 'contain' }}
          />
        )}
        
        {/* Page number badge */}
        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          {index + 1}
        </div>
        
        {/* Source badge - auto-marquee for long names, no scroll conflict */}
        {sourceFile && (
          <div
            className="absolute top-1 left-1 right-7 bg-blue-600/85 text-white text-[10px] px-1 py-0.5 rounded overflow-hidden whitespace-nowrap"
            title={`${sourceFile.name} — p.${page.sourcePageIndex + 1}`}
          >
            <span className="inline-block badge-marquee">{sourceFile.name.replace(/\.pdf$/i, '')}:{page.sourcePageIndex + 1}</span>
          </div>
        )}
        
        {/* Selection checkbox */}
        <div className={`absolute top-1 right-1 w-5 h-5 rounded border-2 flex items-center justify-center
          ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-400'}
        `}>
          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
        </div>
      </div>
      
      {/* Split point indicator */}
      <div className="w-full flex justify-center my-1">
        <button
          onClick={(e) => { e.stopPropagation(); onSplitToggle(index); }}
          className={`text-xs px-2 py-0.5 rounded transition-all
            ${hasSplitAfter
              ? 'bg-red-500 text-white font-bold'
              : 'bg-transparent text-gray-400 hover:bg-red-100 hover:text-red-500'
            }`}
          title={hasSplitAfter ? t('removeSplitPoint', lang) : t('splitHere', lang)}
        >
          {hasSplitAfter ? `✂ ${t('splitHere', lang)}` : '···'}
        </button>
      </div>
    </div>
  );
});

export default PageThumbnail;

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import type { VirtualPage, PDFSourceFile } from '../types';
import PageThumbnail from './PageThumbnail';
import { t, type Lang } from '../i18n';

interface Props {
  pages: VirtualPage[];
  sourceFiles: PDFSourceFile[];
  selectedPages: Set<number>;
  splitPoints: number[];
  focusedPage: number;
  lang: Lang;
  quality: number;
  onPageClick: (index: number, e: React.MouseEvent) => void;
  onPageDoubleClick: (index: number) => void;
  onSplitToggle: (index: number) => void;
  onContextMenu: (index: number, e: React.MouseEvent) => void;
  scrollToIndex: number | null;
  onScrollHandled: () => void;
}

// We do a simple windowed approach: only render pages visible + buffer
const ITEM_HEIGHT = 250; // approximate height of each thumbnail + split area
const COLS_DESKTOP = 6;
const COLS_TABLET = 4;
const COLS_MOBILE = 2;

function getColumns(): number {
  if (typeof window === 'undefined') return COLS_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return COLS_MOBILE;
  if (w < 1024) return COLS_TABLET;
  return COLS_DESKTOP;
}

export default function PageGrid({
  pages, sourceFiles, selectedPages, splitPoints, focusedPage,
  lang, quality, onPageClick, onPageDoubleClick, onSplitToggle, onContextMenu,
  scrollToIndex, onScrollHandled,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(getColumns);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(800);

  // Source file map for quick lookup
  const sourceMap = useMemo(() => {
    const m = new Map<string, PDFSourceFile>();
    sourceFiles.forEach(f => m.set(f.id, f));
    return m;
  }, [sourceFiles]);

  // Handle resize
  useEffect(() => {
    const onResize = () => {
      setCols(getColumns());
      if (containerRef.current) {
        setViewHeight(containerRef.current.clientHeight);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Split points affect row heights - each split adds visual separation
  // For simplicity, we treat each row as having uniform height
  const rows = useMemo(() => {
    const result: { startIdx: number; endIdx: number; hasSplitInRow: boolean }[] = [];
    for (let i = 0; i < pages.length; i += cols) {
      const endIdx = Math.min(i + cols - 1, pages.length - 1);
      // Check if any page in this row has a split after it
      let hasSplit = false;
      for (let j = i; j <= endIdx; j++) {
        if (splitPoints.includes(j)) hasSplit = true;
      }
      result.push({ startIdx: i, endIdx, hasSplitInRow: hasSplit });
    }
    return result;
  }, [pages.length, cols, splitPoints]);

  const rowHeight = ITEM_HEIGHT;
  const totalHeight = rows.length * rowHeight;

  // Determine visible range
  const bufferPx = 400;
  const startRow = Math.max(0, Math.floor((scrollTop - bufferPx) / rowHeight));
  const endRow = Math.min(rows.length - 1, Math.ceil((scrollTop + viewHeight + bufferPx) / rowHeight));

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Scroll to specific index
  useEffect(() => {
    if (scrollToIndex !== null && scrollToIndex >= 0 && containerRef.current) {
      const rowIdx = Math.floor(scrollToIndex / cols);
      const targetScroll = rowIdx * rowHeight - viewHeight / 2 + rowHeight / 2;
      containerRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      onScrollHandled();
    }
  }, [scrollToIndex, cols, rowHeight, viewHeight, onScrollHandled]);

  const visiblePages = useMemo(() => {
    const result: { page: VirtualPage; index: number }[] = [];
    for (let r = startRow; r <= endRow; r++) {
      if (r >= rows.length) break;
      const row = rows[r];
      for (let i = row.startIdx; i <= row.endIdx; i++) {
        result.push({ page: pages[i], index: i });
      }
    }
    return result;
  }, [startRow, endRow, rows, pages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900"
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: startRow * rowHeight,
            left: 0,
            right: 0,
          }}
        >
          <div
            className="grid gap-2 p-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {visiblePages.map(({ page, index }) => {
              const rowIdx = Math.floor(index / cols);
              const isFirstInRow = index % cols === 0;
              
              // Add split divider if needed - rendered as part of the page
              return (
                <React.Fragment key={page.id}>
                  {/* Check if we need a split divider before this row */}
                  {isFirstInRow && rowIdx > 0 && (() => {
                    // Check if the last page of the previous row has a split
                    const prevRowEnd = rowIdx * cols - 1;
                    if (prevRowEnd < pages.length && splitPoints.includes(prevRowEnd)) {
                      return null; // handled below in thumbnail
                    }
                    return null;
                  })()}
                  <PageThumbnail
                    page={page}
                    index={index}
                    isSelected={selectedPages.has(index)}
                    isFocused={focusedPage === index}
                    hasSplitAfter={splitPoints.includes(index)}
                    sourceFile={sourceMap.get(page.sourceId)}
                    lang={lang}
                    quality={quality}
                    onClick={onPageClick}
                    onDoubleClick={onPageDoubleClick}
                    onSplitToggle={onSplitToggle}
                    onContextMenu={onContextMenu}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      
      {pages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>{t('loading', lang)}</p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { t, type Lang } from '../i18n';
import type { PDFSourceFile, OutlineItem, VirtualPage } from '../types';

interface Props {
  lang: Lang;
  sourceFiles: PDFSourceFile[];
  pages: VirtualPage[];
  splitPoints: number[];
  customOutline: OutlineItem[] | null;
  onJumpTo: (pageIndex: number) => void;
  onSelectRange: (from: number, to: number) => void;
  onEditOutline: () => void;
}

function OutlineTree({
  items, depth, sourceId, pages, onJumpTo,
}: {
  items: OutlineItem[]; depth: number; sourceId: string | null;
  pages: VirtualPage[]; onJumpTo: (pageIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(idx)) n.delete(idx); else n.add(idx);
      return n;
    });
  };

  return (
    <div className={depth > 0 ? 'ml-3 border-l border-gray-300 dark:border-gray-600 pl-2' : ''}>
      {items.map((item, idx) => {
        let virtualIdx: number;
        if (sourceId) {
          virtualIdx = pages.findIndex(p => p.sourceId === sourceId && p.sourcePageIndex === item.pageIndex);
        } else {
          // Global outline: pageIndex is already global
          virtualIdx = item.pageIndex >= 0 && item.pageIndex < pages.length ? item.pageIndex : -1;
        }
        const hasChildren = item.children.length > 0;
        const isExpanded = expanded.has(idx);

        return (
          <div key={idx}>
            <div
              className="flex items-center gap-1 py-1 px-1 rounded hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-sm group"
              onClick={() => { if (virtualIdx >= 0) onJumpTo(virtualIdx); }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => toggleExpand(idx, e)}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-500 rounded"
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}
              <span className="flex-1 truncate text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {item.title}
              </span>
              {virtualIdx >= 0 ? (
                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1 tabular-nums">p.{virtualIdx + 1}</span>
              ) : (
                <span className="text-[10px] text-red-400 flex-shrink-0 ml-1" title="Page deleted">✕</span>
              )}
            </div>
            {hasChildren && isExpanded && (
              <OutlineTree items={item.children} depth={depth + 1} sourceId={sourceId} pages={pages} onJumpTo={onJumpTo} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OutlinePanel({
  lang, sourceFiles, pages, splitPoints, customOutline,
  onJumpTo, onSelectRange, onEditOutline,
}: Props) {
  const [jumpInput, setJumpInput] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [activeTab, setActiveTab] = useState<'outline' | 'nav' | 'splits'>('outline');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(sourceFiles.map(f => f.id)));

  const toggleFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFiles(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const segments = useMemo(() => {
    const sorted = [...splitPoints].sort((a, b) => a - b);
    const segs: { start: number; end: number }[] = [];
    let start = 0;
    for (const sp of sorted) {
      segs.push({ start, end: sp });
      start = sp + 1;
    }
    if (start < pages.length) segs.push({ start, end: pages.length - 1 });
    return segs;
  }, [splitPoints, pages.length]);

  const handleJump = () => {
    const num = parseInt(jumpInput);
    if (num >= 1 && num <= pages.length) { onJumpTo(num - 1); setJumpInput(''); }
  };
  const handleSelectRange = () => {
    const f = parseInt(rangeFrom), to = parseInt(rangeTo);
    if (f >= 1 && to >= 1 && f <= pages.length && to <= pages.length) { onSelectRange(f - 1, to - 1); setRangeFrom(''); setRangeTo(''); }
  };

  const hasCustomOutline = customOutline !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
        {(['outline', 'nav', 'splits'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'outline' ? t('outline', lang) : tab === 'nav' ? t('navigator', lang) : t('splitPoints', lang)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'outline' && (
          <div>
            {/* Edit outline button */}
            <button onClick={onEditOutline}
              className="w-full mb-2 py-1.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 font-medium">
              ✏️ {t('editOutline', lang)} {hasCustomOutline && '(✓)'}
            </button>

            {hasCustomOutline ? (
              // Show unified custom outline
              <div>
                <div className="text-[10px] text-gray-400 mb-1">{lang === 'zh' ? '自定义目录' : 'Custom outline'}</div>
                <OutlineTree items={customOutline} depth={0} sourceId={null} pages={pages} onJumpTo={onJumpTo} />
              </div>
            ) : (
              // Show per-source outlines
              sourceFiles.map(sf => (
                <div key={sf.id} className="mb-2">
                  <div className="flex items-center gap-1 w-full text-left py-1.5 px-2 bg-gray-100 dark:bg-gray-700 rounded font-medium text-sm text-gray-800 dark:text-gray-200">
                    <button onClick={(e) => toggleFile(sf.id, e)}
                      className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-500 rounded">
                      {expandedFiles.has(sf.id) ? '▾' : '▸'}
                    </button>
                    {/* Scrollable file name */}
                    <span className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-hide text-sm cursor-default"
                      style={{ scrollbarWidth: 'none' }} title={sf.name}>
                      📄 {sf.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{sf.pageCount}p</span>
                  </div>
                  {expandedFiles.has(sf.id) && (
                    sf.outline.length > 0
                      ? <OutlineTree items={sf.outline} depth={0} sourceId={sf.id} pages={pages} onJumpTo={onJumpTo} />
                      : <p className="text-xs text-gray-400 ml-6 mt-1">{t('noOutline', lang)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'nav' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('jumpTo', lang)} (1-{pages.length})</label>
              <div className="flex gap-1">
                <input type="number" min={1} max={pages.length} value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                  className="flex-1 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600" placeholder="1" />
                <button onClick={handleJump} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{t('goTo', lang)}</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('selectByRange', lang)}</label>
              <div className="flex gap-1 items-center">
                <input type="number" min={1} max={pages.length} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-16 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600" placeholder={t('from', lang)} />
                <span className="text-gray-400">-</span>
                <input type="number" min={1} max={pages.length} value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSelectRange()}
                  className="w-16 px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600" placeholder={t('to', lang)} />
                <button onClick={handleSelectRange} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">{t('apply', lang)}</button>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-sm space-y-1">
              <p className="text-gray-600 dark:text-gray-400">{t('totalPages', lang)}: <strong className="text-gray-800 dark:text-gray-200">{pages.length}</strong></p>
              <p className="text-gray-600 dark:text-gray-400">{t('splitPoints', lang)}: <strong className="text-gray-800 dark:text-gray-200">{splitPoints.length}</strong></p>
              <p className="text-gray-600 dark:text-gray-400">{t('segment', lang)}: <strong className="text-gray-800 dark:text-gray-200">{Math.max(1, splitPoints.length + 1)}</strong></p>
            </div>
          </div>
        )}

        {activeTab === 'splits' && (
          <div className="space-y-2">
            {segments.length === 0 && <p className="text-sm text-gray-400">{t('noOutline', lang)}</p>}
            {segments.map((seg, idx) => (
              <div key={idx} className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => onJumpTo(seg.start)}>
                <div className="font-medium text-gray-800 dark:text-gray-200">{t('part', lang)} {idx + 1}</div>
                <div className="text-xs text-gray-500">{t('page', lang)} {seg.start + 1} - {seg.end + 1} ({seg.end - seg.start + 1} {t('pages', lang)})</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

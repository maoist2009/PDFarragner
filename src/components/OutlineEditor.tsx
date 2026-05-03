import { useState, useRef } from 'react';
import { t, type Lang } from '../i18n';
import type { OutlineItem } from '../types';

interface Props {
  lang: Lang;
  initialOutline: OutlineItem[];
  totalPages: number;
  onSave: (outline: OutlineItem[]) => void;
  onClose: () => void;
}

interface FlatItem {
  id: string;
  title: string;
  pageIndex: number;
  depth: number;
}

let outlineIdCounter = 0;
function makeId() { return `o_${Date.now()}_${outlineIdCounter++}`; }

function flatten(items: OutlineItem[], depth: number = 0): FlatItem[] {
  const result: FlatItem[] = [];
  for (const it of items) {
    result.push({ id: makeId(), title: it.title, pageIndex: it.pageIndex, depth });
    if (it.children?.length) result.push(...flatten(it.children, depth + 1));
  }
  return result;
}

function unflatten(flat: FlatItem[]): OutlineItem[] {
  const result: OutlineItem[] = [];
  const stack: { node: OutlineItem; depth: number }[] = [];
  for (const f of flat) {
    const node: OutlineItem = { title: f.title, pageIndex: f.pageIndex, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= f.depth) stack.pop();
    if (stack.length === 0) {
      result.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ node, depth: f.depth });
  }
  return result;
}

export default function OutlineEditor({ lang, initialOutline, totalPages, onSave, onClose }: Props) {
  const [items, setItems] = useState<FlatItem[]>(() => flatten(initialOutline));
  const dragSrc = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; pos: 'before' | 'after' } | null>(null);

  const update = (idx: number, patch: Partial<FlatItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const remove = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const indent = (idx: number) => {
    if (idx === 0) return;
    const prevDepth = items[idx - 1].depth;
    if (items[idx].depth <= prevDepth) {
      update(idx, { depth: items[idx].depth + 1 });
    }
  };

  const outdent = (idx: number) => {
    if (items[idx].depth > 0) update(idx, { depth: items[idx].depth - 1 });
  };

  const add = () => {
    setItems(prev => [...prev, { id: makeId(), title: 'New item', pageIndex: 0, depth: 0 }]);
  };

  const handleDragStart = (idx: number) => { dragSrc.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos: 'before' | 'after' = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after';
    setDropTarget({ index: idx, pos });
  };
  const handleDrop = (idx: number) => {
    if (dragSrc.current === null || dragSrc.current === idx) {
      dragSrc.current = null;
      setDropTarget(null);
      return;
    }
    const src = dragSrc.current;
    const pos = dropTarget?.pos ?? 'before';
    setItems(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(src, 1);
      let target = idx;
      if (src < idx) target -= 1;
      if (pos === 'after') target += 1;
      arr.splice(target, 0, moved);
      return arr;
    });
    dragSrc.current = null;
    setDropTarget(null);
  };

  const handleSave = () => {
    onSave(unflatten(items));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-gray-200">📑 {t('editOutline', lang)}</h2>
          <button onClick={onClose} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">✕</button>
        </div>

        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center">
          <button onClick={add} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">+ {t('addOutlineItem', lang)}</button>
          <span className="text-xs text-gray-500">{t('outlineEditTip', lang)}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">{t('noOutline', lang)}</p>
          )}
          {items.map((it, idx) => (
            <div
              key={it.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { dragSrc.current = null; setDropTarget(null); }}
              className={`flex items-center gap-1 p-1.5 rounded border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing
                ${dropTarget?.index === idx && dropTarget?.pos === 'before' ? 'drop-target-above' : ''}
                ${dropTarget?.index === idx && dropTarget?.pos === 'after' ? 'drop-target-below' : ''}
              `}
              style={{ marginLeft: it.depth * 20 }}
            >
              <span className="text-gray-400 select-none flex-shrink-0">⠿</span>
              <button
                onClick={() => outdent(idx)}
                disabled={it.depth === 0}
                className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-600 disabled:opacity-30 flex-shrink-0"
                title={t('outdent', lang)}
              >←</button>
              <button
                onClick={() => indent(idx)}
                disabled={idx === 0 || it.depth > items[idx - 1].depth}
                className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-600 disabled:opacity-30 flex-shrink-0"
                title={t('indent', lang)}
              >→</button>
              <input
                type="text"
                value={it.title}
                onChange={(e) => update(idx, { title: e.target.value })}
                placeholder={t('outlineItemTitle', lang)}
                className="flex-1 min-w-0 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
              />
              <input
                type="number"
                min={1}
                max={totalPages}
                value={it.pageIndex + 1}
                onChange={(e) => update(idx, { pageIndex: Math.max(0, Math.min(totalPages - 1, parseInt(e.target.value || '1') - 1)) })}
                className="w-16 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200 flex-shrink-0"
                title={t('pageNumber', lang)}
              />
              <button
                onClick={() => remove(idx)}
                className="px-2 py-1 text-xs rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0"
                title={t('delete', lang)}
              >🗑</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="flex-1 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{t('cancel', lang)}</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded bg-blue-600 text-white font-medium">{t('saveOutline', lang)}</button>
        </div>
      </div>
    </div>
  );
}

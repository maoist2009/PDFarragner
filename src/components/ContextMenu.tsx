import { useEffect, useRef } from 'react';
import { t, type Lang } from '../i18n';

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface Props {
  x: number;
  y: number;
  lang: Lang;
  pageIndex: number;
  isSelected: boolean;
  hasSplit: boolean;
  onClose: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onToggleSplit: () => void;
  onSelectToHere: () => void;
  onSelectFromHere: () => void;
}

export default function ContextMenu({
  x, y, lang, pageIndex, isSelected, hasSplit,
  onClose, onSelect, onDelete, onInsertBefore, onInsertAfter,
  onToggleSplit, onSelectToHere, onSelectFromHere,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick as any);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick as any);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 350);

  const items: MenuItem[] = [
    { label: isSelected ? t('deselectAll', lang) : t('selectMode', lang), icon: isSelected ? '☐' : '☑', action: onSelect },
    { label: `${t('selectByRange', lang)} → ${t('page', lang)} ${pageIndex + 1}`, icon: '→', action: onSelectToHere },
    { label: `${t('page', lang)} ${pageIndex + 1} → ${t('selectByRange', lang)}`, icon: '←', action: onSelectFromHere },
    { label: t('insertBlankBefore', lang), icon: '⬆', action: onInsertBefore },
    { label: t('insertBlankAfter', lang), icon: '⬇', action: onInsertAfter },
    { label: hasSplit ? t('removeSplitPoint', lang) : t('splitHere', lang), icon: '✂', action: onToggleSplit },
    { label: t('delete', lang), icon: '🗑', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-200 dark:border-gray-700">
        {t('page', lang)} {pageIndex + 1}
      </div>
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => { item.action(); onClose(); }}
          disabled={item.disabled}
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30
            ${item.danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}
          `}
        >
          <span className="w-5 text-center">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

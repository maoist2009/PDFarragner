import { useState } from 'react';
import { t, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  selectedCount: number;
  totalPages: number;
  focusedPage: number;
  canUndo: boolean;
  canRedo: boolean;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onDeleteSelected: () => void;
  onInsertBlank: (atIndex: number, position: 'before' | 'after') => void;
  onMoveSelected: (target: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddFiles: () => void;
}

export default function Toolbar({
  lang, selectedCount, totalPages, focusedPage, canUndo, canRedo,
  selectionMode, onToggleSelectionMode,
  onSelectAll, onDeselectAll, onInvertSelection,
  onDeleteSelected, onInsertBlank, onMoveSelected,
  onUndo, onRedo, onAddFiles,
}: Props) {
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [insertTarget, setInsertTarget] = useState('');
  const [insertPos, setInsertPos] = useState<'before' | 'after'>('after');

  const handleMove = () => {
    const num = parseInt(moveTarget);
    if (num >= 1 && num <= totalPages) {
      onMoveSelected(num - 1);
      setShowMoveDialog(false);
      setMoveTarget('');
    }
  };

  const openInsertDialog = () => {
    setInsertTarget(focusedPage >= 0 ? String(focusedPage + 1) : '1');
    setInsertPos('after');
    setShowInsertDialog(true);
  };

  const handleInsert = () => {
    const num = parseInt(insertTarget);
    if (num >= 1 && num <= Math.max(1, totalPages)) {
      onInsertBlank(num - 1, insertPos);
      setShowInsertDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        {/* Undo/Redo */}
        <button onClick={onUndo} disabled={!canUndo}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-700 dark:text-gray-300" title={t('undo', lang)}>↩</button>
        <button onClick={onRedo} disabled={!canRedo}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-700 dark:text-gray-300" title={t('redo', lang)}>↪</button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        {/* Selection */}
        <button onClick={onSelectAll}
          className="px-1.5 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">☐ {t('selectAll', lang)}</button>
        <button onClick={onDeselectAll}
          className="px-1.5 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">{t('deselectAll', lang)}</button>
        <button onClick={onInvertSelection}
          className="px-1.5 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">⇆ {t('invertSelection', lang)}</button>
        <button onClick={onToggleSelectionMode}
          className={`px-1.5 py-1 text-xs rounded transition-colors ${selectionMode
            ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          title={t('selectMode', lang)}>☑ {t('selectMode', lang)}</button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        {/* Actions */}
        <button onClick={onDeleteSelected} disabled={selectedCount === 0}
          className="px-1.5 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 disabled:opacity-30">
          🗑 {t('deleteSelected', lang)} {selectedCount > 0 && `(${selectedCount})`}</button>
        <button onClick={openInsertDialog}
          className="px-1.5 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200">
          + {t('insertBlank', lang)}</button>
        <button onClick={() => setShowMoveDialog(true)} disabled={selectedCount === 0}
          className="px-1.5 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 disabled:opacity-30">
          ↕ {t('moveSelected', lang)}</button>

        <div className="flex-1" />

        <button onClick={onAddFiles}
          className="px-1.5 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
          📄+ <span className="hidden sm:inline">{t('addMoreFiles', lang)}</span></button>
      </div>

      {/* Insert blank dialog */}
      {showInsertDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInsertDialog(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3 text-gray-800 dark:text-gray-200">{t('insertBlank', lang)}</h3>
            <div className="mb-3">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('referencePage', lang)} (1-{Math.max(1, totalPages)})
              </label>
              <input type="number" min={1} max={Math.max(1, totalPages)} value={insertTarget}
                onChange={(e) => setInsertTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600" autoFocus />
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setInsertPos('before')}
                className={`flex-1 py-2 rounded text-sm font-medium border ${insertPos === 'before'
                  ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}>
                ⬆ {t('insertBefore', lang)}</button>
              <button onClick={() => setInsertPos('after')}
                className={`flex-1 py-2 rounded text-sm font-medium border ${insertPos === 'after'
                  ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}>
                ⬇ {t('insertAfter', lang)}</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInsertDialog(false)} className="flex-1 py-2 rounded text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{t('cancel', lang)}</button>
              <button onClick={handleInsert} className="flex-1 py-2 rounded text-sm bg-blue-600 text-white font-medium">{t('confirm', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Move dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMoveDialog(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3 text-gray-800 dark:text-gray-200">{t('moveToPosition', lang)}</h3>
            <p className="text-sm text-gray-500 mb-3">{t('selected', lang)}: {selectedCount} {t('pages', lang)}</p>
            <div className="flex gap-2">
              <input type="number" min={1} max={totalPages} value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMove()}
                className="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                placeholder={`${t('targetPosition', lang)} (1-${totalPages})`} autoFocus />
              <button onClick={handleMove} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{t('confirm', lang)}</button>
            </div>
            <button onClick={() => setShowMoveDialog(false)} className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700">{t('cancel', lang)}</button>
          </div>
        </div>
      )}
    </>
  );
}

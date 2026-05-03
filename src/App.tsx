import { useState, useCallback, useEffect } from 'react';
import { StoreProvider, useStore, genId } from './store';
import { loadPDFDocument, extractOutline } from './pdfEngine';
import { t, type Lang } from './i18n';
import type { PDFSourceFile, VirtualPage } from './types';
import FileUpload from './components/FileUpload';
import Toolbar from './components/Toolbar';
import PageGrid from './components/PageGrid';
import OutlinePanel from './components/OutlinePanel';
import ContextMenu from './components/ContextMenu';
import ExportDialog from './components/ExportDialog';
import HelpDialog from './components/HelpDialog';
import SinglePageView from './components/SinglePageView';
import OutlineEditor from './components/OutlineEditor';

function AppContent() {
  const { state, dispatch } = useStore();
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('zh') ? 'zh' : 'en');
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });
  const [showSidebar, setShowSidebar] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOutlineEditor, setShowOutlineEditor] = useState(false);
  const [zoomedPage, setZoomedPage] = useState<number | null>(null);
  const [quality, setQuality] = useState(1);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageIndex: number } | null>(null);

  const hasPages = state.pages.length > 0;

  useEffect(() => {
    if ((navigator.hardwareConcurrency || 2) <= 2) setQuality(0.5);
  }, []);

  const handleFilesConfirmed = useCallback(async (files: File[]) => {
    setLoading(true);
    setShowUpload(false);
    const total = files.length;
    const newSources: PDFSourceFile[] = [];
    const newPages: VirtualPage[] = [];
    for (let i = 0; i < files.length; i++) {
      setLoadProgress({ current: i + 1, total });
      const file = files[i];
      const arrayBuffer = await file.arrayBuffer();
      const id = `src_${Date.now()}_${i}`;
      try {
        const pdfjsCopy = arrayBuffer.slice(0);
        const doc = await loadPDFDocument(id, pdfjsCopy);
        const pageCount = doc.numPages;
        const outline = await extractOutline(doc);
        newSources.push({ id, name: file.name, data: arrayBuffer, pageCount, outline });
        for (let p = 0; p < pageCount; p++) {
          newPages.push({ id: genId(), sourceId: id, sourcePageIndex: p, isBlank: false });
        }
      } catch (err) { console.error(`Error loading ${file.name}:`, err); }
    }
    if (state.pages.length > 0) {
      dispatch({ type: 'ADD_SOURCES', files: newSources });
      dispatch({ type: 'SET_PAGES', pages: [...state.pages, ...newPages] });
    } else {
      dispatch({ type: 'SET_SOURCES', files: newSources });
      dispatch({ type: 'SET_PAGES', pages: newPages });
    }
    setLoading(false);
  }, [dispatch, state.pages]);

  const handlePageClick = useCallback((index: number, e: React.MouseEvent) => {
    dispatch({ type: 'SELECT_PAGE', index, multi: e.ctrlKey || e.metaKey, range: e.shiftKey });
  }, [dispatch]);

  const handlePageDoubleClick = useCallback((index: number) => {
    setZoomedPage(index);
  }, []);

  const handleSplitToggle = useCallback((index: number) => {
    dispatch({ type: 'TOGGLE_SPLIT', afterIndex: index });
  }, [dispatch]);

  const handleContextMenu = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: 'clientX' in e ? e.clientX : window.innerWidth / 2, y: 'clientY' in e ? e.clientY : window.innerHeight / 2, pageIndex: index });
  }, []);

  const handleJumpTo = useCallback((index: number) => {
    setScrollToIndex(index);
    dispatch({ type: 'SET_FOCUSED', index });
  }, [dispatch]);

  const handleSelectRange = useCallback((from: number, to: number) => {
    dispatch({ type: 'SELECT_RANGE', from, to });
  }, [dispatch]);

  const handleScrollHandled = useCallback(() => { setScrollToIndex(null); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'UNDO' }); }
        else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); }
        else if (e.key === 'a') { e.preventDefault(); dispatch({ type: 'SELECT_ALL' }); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedPages.size > 0 && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        dispatch({ type: 'DELETE_PAGES', indices: Array.from(state.selectedPages) });
      }
      if (e.key === 'Escape') { dispatch({ type: 'DESELECT_ALL' }); setContextMenu(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, state.selectedPages]);

  // ── Upload screen ──
  if (!hasPages && !loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">✂️ {t('appTitle', lang)}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHelp(true)} className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200">❓</button>
            <button onClick={() => setQuality(q => q === 0.5 ? 1 : q === 1 ? 1.5 : 0.5)}
              className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={t('renderQuality', lang)}>
              {quality <= 0.5 ? `🐢 ${t('low', lang)}` : quality >= 1.5 ? `🚀 ${t('high', lang)}` : `⚡ ${t('medium', lang)}`}
            </button>
            <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
              className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200">
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <FileUpload lang={lang} onFilesConfirmed={handleFilesConfirmed} hasExistingFiles={false} />
        </div>
        {showHelp && <HelpDialog lang={lang} onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-4xl mb-4 animate-pulse">📄</div>
        <p className="text-lg text-gray-600 dark:text-gray-400">{t('loading', lang)}</p>
        <p className="text-sm text-gray-400 mt-2">{loadProgress.current}/{loadProgress.total} files</p>
        <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
          <div className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${loadProgress.total > 0 ? (loadProgress.current / loadProgress.total) * 100 : 0}%` }} />
        </div>
      </div>
    );
  }

  // ── Main editor ──
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* ═══ Single unified header: title + stats + quality + lang + help + export ═══ */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-40 relative">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setShowSidebar(s => !s)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-lg flex-shrink-0"
            title={t('navigator', lang)}>☰</button>
          <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 hidden md:block flex-shrink-0">✂️ {t('appTitle', lang)}</h1>
          <span className="text-[11px] text-gray-400 hidden sm:inline tabular-nums flex-shrink-0">
            {state.pages.length}{t('pages', lang)}
            {state.selectedPages.size > 0 && <> · <span className="text-blue-500">{state.selectedPages.size} {t('selected', lang)}</span></>}
            {state.splitPoints.length > 0 && <> · {state.splitPoints.length + 1}{t('segment', lang)}</>}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setQuality(q => q === 0.5 ? 1 : q === 1 ? 1.5 : 0.5)}
            className="px-1.5 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            title={t('qualityHint', lang)}>
            {quality <= 0.5 ? '🐢' : quality >= 1.5 ? '🚀' : '⚡'}
          </button>
          <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="px-1.5 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button onClick={() => setShowHelp(true)}
            className="px-1.5 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            title={t('help', lang)}>❓</button>
          <button onClick={() => setShowExport(true)}
            className="px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 font-medium">
            📦 {t('exportZip', lang)}
          </button>
        </div>
      </header>

      {/* ═══ Toolbar (operations only, no Export/Help/Stats) ═══ */}
      <Toolbar
        lang={lang}
        selectedCount={state.selectedPages.size}
        totalPages={state.pages.length}
        focusedPage={state.focusedPage}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
        selectionMode={state.selectionMode}
        onToggleSelectionMode={() => dispatch({ type: 'SET_SELECTION_MODE', enabled: !state.selectionMode })}
        onSelectAll={() => dispatch({ type: 'SELECT_ALL' })}
        onDeselectAll={() => dispatch({ type: 'DESELECT_ALL' })}
        onInvertSelection={() => dispatch({ type: 'INVERT_SELECTION' })}
        onDeleteSelected={() => { if (state.selectedPages.size > 0) dispatch({ type: 'DELETE_PAGES', indices: Array.from(state.selectedPages) }); }}
        onInsertBlank={(atIndex, position) => { dispatch({ type: 'INSERT_BLANK', afterIndex: atIndex, position }); }}
        onMoveSelected={(target) => { if (state.selectedPages.size > 0) dispatch({ type: 'MOVE_PAGES', indices: Array.from(state.selectedPages), targetIndex: target }); }}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onAddFiles={() => setShowUpload(true)}
      />

      {/* ═══ Main content area ═══ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar — z-50 so it covers BOTH header and toolbar when open */}
        {showSidebar && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
            <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl lg:relative lg:shadow-none flex flex-col">
              {/* Sidebar header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">📑 {t('navigator', lang)}</span>
                <button onClick={() => setShowSidebar(false)} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">✕</button>
              </div>
              <OutlinePanel
                lang={lang}
                sourceFiles={state.sourceFiles}
                pages={state.pages}
                splitPoints={state.splitPoints}
                customOutline={state.customOutline}
                onJumpTo={(idx) => { handleJumpTo(idx); if (window.innerWidth < 1024) setShowSidebar(false); }}
                onSelectRange={handleSelectRange}
                onEditOutline={() => { setShowOutlineEditor(true); if (window.innerWidth < 1024) setShowSidebar(false); }}
              />
            </div>
          </>
        )}

        {/* Page grid */}
        <PageGrid
          pages={state.pages}
          sourceFiles={state.sourceFiles}
          selectedPages={state.selectedPages}
          splitPoints={state.splitPoints}
          focusedPage={state.focusedPage}
          lang={lang}
          quality={quality}
          onPageClick={handlePageClick}
          onPageDoubleClick={handlePageDoubleClick}
          onSplitToggle={handleSplitToggle}
          onContextMenu={handleContextMenu}
          scrollToIndex={scrollToIndex}
          onScrollHandled={handleScrollHandled}
        />
      </div>

      {/* ═══ Mobile bottom bar ═══ */}
      <div className="flex sm:hidden items-center justify-around py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button onClick={() => setShowSidebar(s => !s)} className="flex flex-col items-center text-[10px] text-gray-600 dark:text-gray-400 gap-0.5">
          <span className="text-base">📑</span>{t('outline', lang)}</button>
        <button onClick={() => dispatch({ type: 'SET_SELECTION_MODE', enabled: !state.selectionMode })}
          className={`flex flex-col items-center text-[10px] gap-0.5 ${state.selectionMode ? 'text-blue-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
          <span className="text-base">☑</span>{t('selectMode', lang)}</button>
        <button onClick={() => { if (state.selectedPages.size > 0) dispatch({ type: 'DELETE_PAGES', indices: Array.from(state.selectedPages) }); }}
          disabled={state.selectedPages.size === 0}
          className="flex flex-col items-center text-[10px] text-gray-600 dark:text-gray-400 disabled:opacity-30 gap-0.5">
          <span className="text-base">🗑</span>{state.selectedPages.size > 0 ? state.selectedPages.size : t('delete', lang)}</button>
        <button onClick={() => setShowExport(true)} className="flex flex-col items-center text-[10px] text-blue-600 gap-0.5">
          <span className="text-base">📦</span>{t('export', lang)}</button>
      </div>

      {/* ═══ Overlays ═══ */}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} lang={lang}
          pageIndex={contextMenu.pageIndex}
          isSelected={state.selectedPages.has(contextMenu.pageIndex)}
          hasSplit={state.splitPoints.includes(contextMenu.pageIndex)}
          onClose={() => setContextMenu(null)}
          onSelect={() => dispatch({ type: 'SELECT_PAGE', index: contextMenu.pageIndex, multi: true, range: false })}
          onDelete={() => {
            const indices = state.selectedPages.has(contextMenu.pageIndex) ? Array.from(state.selectedPages) : [contextMenu.pageIndex];
            dispatch({ type: 'DELETE_PAGES', indices });
          }}
          onInsertBefore={() => dispatch({ type: 'INSERT_BLANK', afterIndex: contextMenu.pageIndex, position: 'before' })}
          onInsertAfter={() => dispatch({ type: 'INSERT_BLANK', afterIndex: contextMenu.pageIndex, position: 'after' })}
          onToggleSplit={() => dispatch({ type: 'TOGGLE_SPLIT', afterIndex: contextMenu.pageIndex })}
          onSelectToHere={() => {
            const f = state.focusedPage >= 0 ? state.focusedPage : 0;
            dispatch({ type: 'SELECT_RANGE', from: Math.min(f, contextMenu.pageIndex), to: Math.max(f, contextMenu.pageIndex) });
          }}
          onSelectFromHere={() => {
            dispatch({ type: 'SET_FOCUSED', index: contextMenu.pageIndex });
            dispatch({ type: 'SELECT_RANGE', from: contextMenu.pageIndex, to: state.pages.length - 1 });
          }}
        />
      )}

      {showExport && (
        <ExportDialog lang={lang} pages={state.pages} splitPoints={state.splitPoints}
          sourceFiles={state.sourceFiles} outline={state.customOutline}
          onClose={() => setShowExport(false)} />
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('addMoreFiles', lang)}</h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-500">✕</button>
            </div>
            <FileUpload lang={lang} onFilesConfirmed={handleFilesConfirmed} hasExistingFiles={true} />
          </div>
        </div>
      )}

      {showHelp && <HelpDialog lang={lang} onClose={() => setShowHelp(false)} />}

      {zoomedPage !== null && state.pages[zoomedPage] && (
        <SinglePageView pages={state.pages} sourceFiles={state.sourceFiles} initialIndex={zoomedPage}
          lang={lang} onClose={() => setZoomedPage(null)} onJump={(idx) => handleJumpTo(idx)} />
      )}

      {showOutlineEditor && (
        <OutlineEditor lang={lang}
          initialOutline={state.customOutline ?? (() => {
            // Merge source outlines with global page indices
            const result: import('./types').OutlineItem[] = [];
            const offsetItems = (items: import('./types').OutlineItem[], off: number): import('./types').OutlineItem[] =>
              items.map(it => ({ title: it.title, pageIndex: it.pageIndex + off, children: offsetItems(it.children, off) }));
            for (const sf of state.sourceFiles) {
              const firstIdx = state.pages.findIndex(p => p.sourceId === sf.id && p.sourcePageIndex === 0);
              if (firstIdx >= 0 && sf.outline.length > 0) result.push(...offsetItems(sf.outline, firstIdx));
            }
            return result;
          })()}
          totalPages={state.pages.length}
          onSave={(outline) => dispatch({ type: 'SET_CUSTOM_OUTLINE', outline })}
          onClose={() => setShowOutlineEditor(false)} />
      )}
    </div>
  );
}

export default function App() {
  return <StoreProvider><AppContent /></StoreProvider>;
}

import { useState } from 'react';
import { t, type Lang } from '../i18n';
import { computeSegments, exportToZip } from '../exportEngine';
import type { VirtualPage, PDFSourceFile, OutlineItem } from '../types';

interface Props {
  lang: Lang;
  pages: VirtualPage[];
  splitPoints: number[];
  sourceFiles: PDFSourceFile[];
  outline: OutlineItem[] | null;
  onClose: () => void;
}

export default function ExportDialog({ lang, pages, splitPoints, sourceFiles, outline, onClose }: Props) {
  const [prefix, setPrefix] = useState('output');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  const segments = computeSegments(pages, splitPoints, prefix);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportToZip(
        pages,
        splitPoints,
        sourceFiles,
        prefix,
        outline,
        (current: number, total: number, stage: string) => setProgress({ current, total, stage })
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          📦 {t('exportZip', lang)}
        </h2>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">
            {t('filePrefix', lang)}
          </label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value || 'output')}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {t('splitPreview', lang)} ({segments.length} {segments.length === 1 ? 'file' : 'files'})
          </h3>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {segments.map((seg, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                <span className="font-mono text-gray-800 dark:text-gray-200">{seg.name}</span>
                <span className="text-gray-400">{seg.pages.length} {t('pages', lang)}</span>
              </div>
            ))}
          </div>
        </div>

        {outline && outline.length > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400 mb-3">
            ✓ {t('outline', lang)}: {outline.length} {lang === 'zh' ? '项将被写入' : 'items will be written'}
          </p>
        )}

        {exporting ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin text-blue-600">⟳</div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('exporting', lang)} {progress.current}/{progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('cancel', lang)}
            </button>
            <button
              onClick={handleExport}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {t('export', lang)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

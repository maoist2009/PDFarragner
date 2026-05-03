import React, { useCallback, useState, useRef } from 'react';
import { t, type Lang } from '../i18n';

interface PendingFile {
  id: string;
  file: File;
  name: string;
}

interface Props {
  lang: Lang;
  onFilesConfirmed: (files: File[]) => void;
  hasExistingFiles: boolean;
}

export default function FileUpload({ lang, onFilesConfirmed, hasExistingFiles }: Props) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleFiles = useCallback((fileList: FileList) => {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) return;
    
    const pending = files.map((f, i) => ({
      id: `pf_${Date.now()}_${i}`,
      file: f,
      name: f.name,
    }));
    setPendingFiles(prev => [...prev, ...pending]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleConfirm = useCallback(() => {
    onFilesConfirmed(pendingFiles.map(p => p.file));
    setPendingFiles([]);
  }, [pendingFiles, onFilesConfirmed]);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOver.current = idx;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOver.current !== null && dragItem.current !== dragOver.current) {
      const items = [...pendingFiles];
      const draggedItem = items[dragItem.current];
      items.splice(dragItem.current, 1);
      items.splice(dragOver.current, 0, draggedItem);
      setPendingFiles(items);
    }
    dragItem.current = null;
    dragOver.current = null;
  };

  const removeFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  if (pendingFiles.length > 0) {
    return (
      <div className="w-full max-w-lg mx-auto p-4">
        <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-200">
          {t('fileOrder', lang)}
        </h3>
        <p className="text-sm text-gray-500 mb-3">{t('dragToReorder', lang)}</p>
        <div className="space-y-2 mb-4">
          {pendingFiles.map((pf, idx) => (
            <div
              key={pf.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors"
            >
              <span className="text-gray-400 text-lg select-none">⠿</span>
              <span className="font-medium text-sm text-gray-500 w-6">{idx + 1}</span>
              <span className="flex-1 text-sm truncate text-gray-800 dark:text-gray-200">{pf.name}</span>
              <button
                onClick={() => removeFile(idx)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200"
          >
            + {t('addMoreFiles', lang)}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {t('confirmOrder', lang)} ({pendingFiles.length})
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
          }`}
      >
        <div className="text-5xl mb-4">📄</div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {hasExistingFiles ? t('addMoreFiles', lang) : t('dropHere', lang)}
        </p>
        <p className="text-sm text-gray-500 mt-2">{t('supportMultiple', lang)}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

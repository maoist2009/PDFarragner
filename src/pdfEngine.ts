import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// For single-file offline builds, we use the fake worker (main thread).
// This is acceptable because we render pages lazily/on-demand.
// In pdf.js v4+, not setting workerSrc causes it to fall back to main thread.
if (typeof window !== 'undefined') {
  try {
    // Try to use a worker via URL import for better performance
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString();
  } catch {
    // Falls back to fake worker (main thread) - fine for our use case
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
}

// Cache of loaded PDF documents
const docCache = new Map<string, PDFDocumentProxy>();

// Render task cancellation
const activeRenders = new Map<string, { cancel: () => void }>();

// Thumbnail cache (low-res blobs)
const thumbCache = new Map<string, string>(); // key -> objectURL

export async function loadPDFDocument(id: string, data: ArrayBuffer): Promise<PDFDocumentProxy> {
  if (docCache.has(id)) return docCache.get(id)!;
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(data),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/cmaps/',
    cMapPacked: true,
    disableAutoFetch: true,
    disableStream: true,
  }).promise;
  docCache.set(id, doc);
  return doc;
}

export function getDoc(id: string): PDFDocumentProxy | undefined {
  return docCache.get(id);
}

export async function getPageDimensions(
  sourceId: string,
  pageIndex: number
): Promise<{ width: number; height: number }> {
  const doc = docCache.get(sourceId);
  if (!doc) return { width: 595, height: 842 }; // A4 default
  const page = await doc.getPage(pageIndex + 1);
  const vp = page.getViewport({ scale: 1 });
  return { width: vp.width, height: vp.height };
}

export async function renderPageToCanvas(
  canvas: HTMLCanvasElement,
  sourceId: string,
  pageIndex: number,
  scale: number,
  renderKey: string
): Promise<void> {
  // Cancel any previous render for this key
  const prev = activeRenders.get(renderKey);
  if (prev) {
    prev.cancel();
    activeRenders.delete(renderKey);
  }

  const doc = docCache.get(sourceId);
  if (!doc) return;

  try {
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
    });

    activeRenders.set(renderKey, {
      cancel: () => renderTask.cancel(),
    });

    await renderTask.promise;
    activeRenders.delete(renderKey);
  } catch (e: any) {
    if (e?.name !== 'RenderingCancelledException') {
      console.warn('Render error:', e);
    }
  }
}

export async function renderThumbnail(
  sourceId: string,
  pageIndex: number,
  maxWidth: number = 150
): Promise<string> {
  const key = `${sourceId}_${pageIndex}_${maxWidth}`;
  if (thumbCache.has(key)) return thumbCache.get(key)!;

  const doc = docCache.get(sourceId);
  if (!doc) return '';

  const page = await doc.getPage(pageIndex + 1);
  const vp = page.getViewport({ scale: 1 });
  const scale = maxWidth / vp.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), 'image/jpeg', 0.6)
  );
  const url = URL.createObjectURL(blob);
  thumbCache.set(key, url);
  return url;
}

export async function extractOutline(doc: PDFDocumentProxy): Promise<any[]> {
  try {
    const outline = await doc.getOutline();
    if (!outline) return [];
    
    const processItems = async (items: any[]): Promise<any[]> => {
      const result: any[] = [];
      for (const item of items) {
        let pageIndex = 0;
        if (item.dest) {
          try {
            let dest = item.dest;
            if (typeof dest === 'string') {
              dest = await doc.getDestination(dest);
            }
            if (dest && dest[0]) {
              const pageRef = dest[0];
              pageIndex = await doc.getPageIndex(pageRef);
            }
          } catch {
            pageIndex = 0;
          }
        }
        const children = item.items ? await processItems(item.items) : [];
        result.push({
          title: item.title || '',
          pageIndex,
          children,
        });
      }
      return result;
    };
    
    return await processItems(outline);
  } catch {
    return [];
  }
}

export function cleanupDoc(id: string) {
  const doc = docCache.get(id);
  if (doc) {
    doc.destroy();
    docCache.delete(id);
  }
  // Clean thumb cache for this doc
  for (const [key, url] of thumbCache.entries()) {
    if (key.startsWith(id + '_')) {
      URL.revokeObjectURL(url);
      thumbCache.delete(key);
    }
  }
}

export function cleanupAll() {
  for (const [id] of docCache) {
    cleanupDoc(id);
  }
}

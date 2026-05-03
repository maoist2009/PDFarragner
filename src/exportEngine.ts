import { PDFDocument, PageSizes, PDFDict, PDFName, PDFHexString, PDFNumber } from 'pdf-lib';
import JSZip from 'jszip';
import type { VirtualPage, PDFSourceFile, OutlineItem } from './types';

interface ExportSegment {
  name: string;
  pages: VirtualPage[];
  globalStartIndex: number;   // index in the full pages array
  globalEndIndex: number;
}

export function computeSegments(
  pages: VirtualPage[],
  splitPoints: number[],
  prefix: string
): ExportSegment[] {
  const sorted = [...splitPoints].sort((a, b) => a - b);
  const segments: ExportSegment[] = [];
  let start = 0;

  for (let i = 0; i <= sorted.length; i++) {
    const end = i < sorted.length ? sorted[i] + 1 : pages.length;
    const segPages = pages.slice(start, end);
    if (segPages.length > 0) {
      segments.push({
        name: `${prefix}_${String(segments.length + 1).padStart(3, '0')}.pdf`,
        pages: segPages,
        globalStartIndex: start,
        globalEndIndex: end - 1,
      });
    }
    start = end;
  }

  if (segments.length === 0 && pages.length > 0) {
    segments.push({ name: `${prefix}_001.pdf`, pages, globalStartIndex: 0, globalEndIndex: pages.length - 1 });
  }

  return segments;
}

// ─── Outline range computation ───
// An outline item's "range" is from its own page index to right before the next
// sibling (or parent-end if it's the last child).  We include an outline node
// in a segment if range ∩ segment ≠ ∅.

interface FlatOutlineNode {
  title: string;
  globalPage: number;   // page index in the FULL virtual pages array
  depth: number;
  rangeStart: number;   // inclusive
  rangeEnd: number;     // inclusive
}

function flattenWithRanges(
  items: OutlineItem[],
  depth: number,
  parentRangeEnd: number
): FlatOutlineNode[] {
  const result: FlatOutlineNode[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    // rangeEnd = next sibling's page - 1, or parentRangeEnd
    const nextSiblingPage = i + 1 < items.length ? items[i + 1].pageIndex : parentRangeEnd + 1;
    const rangeEnd = nextSiblingPage - 1;
    result.push({
      title: it.title,
      globalPage: it.pageIndex,
      depth,
      rangeStart: it.pageIndex,
      rangeEnd: Math.max(it.pageIndex, rangeEnd),
    });
    if (it.children.length > 0) {
      result.push(...flattenWithRanges(it.children, depth + 1, Math.max(it.pageIndex, rangeEnd)));
    }
  }
  return result;
}

function buildOutlineForSegment(
  flatNodes: FlatOutlineNode[],
  segStart: number,
  segEnd: number,
  totalPagesInSeg: number
): { title: string; localPage: number; depth: number }[] {
  // Filter nodes whose range overlaps [segStart, segEnd]
  const result: { title: string; localPage: number; depth: number }[] = [];
  for (const n of flatNodes) {
    if (n.rangeEnd < segStart || n.rangeStart > segEnd) continue;
    // Local page = clamp to segment, then offset
    const localPage = Math.max(0, Math.min(n.globalPage - segStart, totalPagesInSeg - 1));
    result.push({ title: n.title, localPage, depth: n.depth });
  }
  return result;
}

// ─── Write outline into PDFDocument using pdf-lib low-level API ───

function writeOutlineToDoc(
  doc: PDFDocument,
  items: { title: string; localPage: number; depth: number }[]
) {
  if (items.length === 0) return;

  const ctx = doc.context;
  const pages = doc.getPages();

  // Build a tree structure from flat depth-items
  interface Node {
    title: string;
    pageIdx: number;
    children: Node[];
    ref?: any;
    parent?: any;
  }
  const root: Node = { title: '', pageIdx: 0, children: [], ref: null };
  const stack: Node[] = [root];

  for (const it of items) {
    const node: Node = { title: it.title, pageIdx: it.localPage, children: [] };
    // Pop stack until we find a parent at depth < current
    // depth 0 -> parent is root (stack[0])
    while (stack.length > it.depth + 1) stack.pop();
    const parent = stack[stack.length - 1];
    parent.children.push(node);
    stack.push(node);
  }

  // Now recursively create PDF outline dicts
  function createOutlineItem(
    node: Node,
    parentRef: any
  ): any {
    const ref = ctx.nextRef();
    const pageRef = node.pageIdx < pages.length ? pages[node.pageIdx].ref : pages[0].ref;
    const dict = ctx.obj({});
    dict.set(PDFName.of('Title'), PDFHexString.fromText(node.title));
    dict.set(PDFName.of('Parent'), parentRef);
    dict.set(PDFName.of('Dest'), ctx.obj([pageRef, PDFName.of('Fit')]));
    node.ref = ref;

    if (node.children.length > 0) {
      const childRefs: any[] = [];
      for (const child of node.children) {
        childRefs.push(createOutlineItem(child, ref));
      }
      // Link children: First/Last + Prev/Next chain
      dict.set(PDFName.of('First'), childRefs[0]);
      dict.set(PDFName.of('Last'), childRefs[childRefs.length - 1]);
      dict.set(PDFName.of('Count'), PDFNumber.of(node.children.length));
      for (let i = 0; i < childRefs.length; i++) {
        const childDict = ctx.lookup(childRefs[i]) as PDFDict;
        if (i > 0) childDict.set(PDFName.of('Prev'), childRefs[i - 1]);
        if (i < childRefs.length - 1) childDict.set(PDFName.of('Next'), childRefs[i + 1]);
      }
    }

    ctx.assign(ref, dict);
    return ref;
  }

  // Create the outline root
  const outlinesRef = ctx.nextRef();
  const outlinesDict = ctx.obj({});
  outlinesDict.set(PDFName.of('Type'), PDFName.of('Outlines'));

  const childRefs: any[] = [];
  for (const child of root.children) {
    childRefs.push(createOutlineItem(child, outlinesRef));
  }

  if (childRefs.length > 0) {
    outlinesDict.set(PDFName.of('First'), childRefs[0]);
    outlinesDict.set(PDFName.of('Last'), childRefs[childRefs.length - 1]);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(childRefs.length));
    for (let i = 0; i < childRefs.length; i++) {
      const childDict = ctx.lookup(childRefs[i]) as PDFDict;
      if (i > 0) childDict.set(PDFName.of('Prev'), childRefs[i - 1]);
      if (i < childRefs.length - 1) childDict.set(PDFName.of('Next'), childRefs[i + 1]);
    }
  }

  ctx.assign(outlinesRef, outlinesDict);

  // Set /Outlines on the catalog
  // pdf-lib's catalog is a PDFDict itself, we can set on it directly
  (doc.catalog as unknown as PDFDict).set(PDFName.of('Outlines'), outlinesRef);
  (doc.catalog as unknown as PDFDict).set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}

export async function exportToZip(
  pages: VirtualPage[],
  splitPoints: number[],
  sourceFiles: PDFSourceFile[],
  prefix: string,
  outline: OutlineItem[] | null,
  onProgress: (current: number, total: number, stage: string) => void
): Promise<Blob> {
  const segments = computeSegments(pages, splitPoints, prefix);
  const total = segments.length;

  // Pre-load source PDFDocuments via pdf-lib
  const sourceDocsMap = new Map<string, PDFDocument>();

  onProgress(0, total, 'loading');

  for (const sf of sourceFiles) {
    if (!sourceDocsMap.has(sf.id)) {
      if (sf.data.byteLength === 0) {
        throw new Error(`Source file "${sf.name}" has an empty/detached buffer. Please re-upload.`);
      }
      const dataCopy = sf.data.slice(0);
      const doc = await PDFDocument.load(dataCopy, { ignoreEncryption: true });
      sourceDocsMap.set(sf.id, doc);
    }
  }

  // Prepare outline: if user provided a custom outline, pageIndex is already
  // global (relative to the virtual pages array). If null, we merge source outlines
  // by offsetting each source's page indices.
  let globalOutline: OutlineItem[] = [];
  if (outline && outline.length > 0) {
    globalOutline = outline;
  } else {
    // Merge source outlines with global offsets
    for (const sf of sourceFiles) {
      if (sf.outline.length > 0) {
        const offsetItems = (items: OutlineItem[], off: number): OutlineItem[] =>
          items.map(it => ({
            title: it.title,
            pageIndex: it.pageIndex + off,
            children: offsetItems(it.children, off),
          }));
        // Find the offset: where does the first page of this source appear in the pages array?
        const firstIdx = pages.findIndex(p => p.sourceId === sf.id && p.sourcePageIndex === 0);
        if (firstIdx >= 0) {
          globalOutline.push(...offsetItems(sf.outline, firstIdx));
        }
      }
    }
  }

  // Flatten outline with ranges
  const flatNodes = flattenWithRanges(globalOutline, 0, pages.length - 1);

  const zip = new JSZip();

  for (let si = 0; si < segments.length; si++) {
    onProgress(si, total, 'building');
    const seg = segments[si];
    const outDoc = await PDFDocument.create();

    for (const vp of seg.pages) {
      if (vp.isBlank) {
        outDoc.addPage(PageSizes.A4);
      } else {
        const srcDoc = sourceDocsMap.get(vp.sourceId);
        if (srcDoc) {
          const [copiedPage] = await outDoc.copyPages(srcDoc, [vp.sourcePageIndex]);
          outDoc.addPage(copiedPage);
        }
      }
    }

    // Build outline for this segment
    const segOutline = buildOutlineForSegment(flatNodes, seg.globalStartIndex, seg.globalEndIndex, seg.pages.length);
    if (segOutline.length > 0) {
      try {
        writeOutlineToDoc(outDoc, segOutline);
      } catch (e) {
        console.warn('Failed to write outline for segment', si, e);
      }
    }

    const pdfBytes = await outDoc.save();
    zip.file(seg.name, pdfBytes);
  }

  onProgress(total, total, 'zipping');
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

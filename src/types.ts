export interface PDFSourceFile {
  id: string;
  name: string;
  data: ArrayBuffer; // keep the raw bytes for pdf-lib at export
  pageCount: number;
  outline: OutlineItem[];
}

export interface OutlineItem {
  title: string;
  pageIndex: number; // 0-based within source file
  children: OutlineItem[];
}

export interface VirtualPage {
  id: string;           // unique id
  sourceId: string;     // '' for blank pages
  sourcePageIndex: number; // 0-based page index in source
  isBlank: boolean;
}

export interface SplitPoint {
  afterPageIndex: number; // index in the virtual pages array (0-based) - split AFTER this page
}

export interface AppState {
  sourceFiles: PDFSourceFile[];
  pages: VirtualPage[];
  splitPoints: number[]; // indices in pages array - split after these
  selectedPages: Set<number>; // indices in pages array
  focusedPage: number;
}

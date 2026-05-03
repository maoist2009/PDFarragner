import React, { createContext, useContext, useReducer } from 'react';
import type { VirtualPage, PDFSourceFile, OutlineItem } from './types';

export interface State {
  sourceFiles: PDFSourceFile[];
  pages: VirtualPage[];
  splitPoints: number[];
  selectedPages: Set<number>;
  focusedPage: number;
  selectionMode: boolean; // When true, clicks toggle selection
  customOutline: OutlineItem[] | null; // null = use source outlines; non-null = user-edited unified outline
  undoStack: { pages: VirtualPage[]; splitPoints: number[] }[];
  redoStack: { pages: VirtualPage[]; splitPoints: number[] }[];
}

type Action =
  | { type: 'SET_SOURCES'; files: PDFSourceFile[] }
  | { type: 'ADD_SOURCES'; files: PDFSourceFile[] }
  | { type: 'SET_PAGES'; pages: VirtualPage[] }
  | { type: 'DELETE_PAGES'; indices: number[] }
  | { type: 'INSERT_BLANK'; afterIndex: number; position: 'before' | 'after' }
  | { type: 'MOVE_PAGES'; indices: number[]; targetIndex: number }
  | { type: 'SELECT_PAGE'; index: number; multi: boolean; range: boolean }
  | { type: 'SELECT_RANGE'; from: number; to: number }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'INVERT_SELECTION' }
  | { type: 'SET_FOCUSED'; index: number }
  | { type: 'ADD_SPLIT'; afterIndex: number }
  | { type: 'REMOVE_SPLIT'; afterIndex: number }
  | { type: 'TOGGLE_SPLIT'; afterIndex: number }
  | { type: 'SET_SELECTION_MODE'; enabled: boolean }
  | { type: 'SET_CUSTOM_OUTLINE'; outline: OutlineItem[] | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_UNDO' };

const MAX_UNDO = 30;

function pushUndo(state: State): State {
  const snapshot = { pages: [...state.pages], splitPoints: [...state.splitPoints] };
  const undoStack = [...state.undoStack, snapshot].slice(-MAX_UNDO);
  return { ...state, undoStack, redoStack: [] };
}

let idCounter = 0;
export function genId(): string {
  return `p_${Date.now()}_${idCounter++}`;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SOURCES':
      return { ...state, sourceFiles: action.files };

    case 'ADD_SOURCES':
      return { ...state, sourceFiles: [...state.sourceFiles, ...action.files] };

    case 'SET_PAGES':
      return { ...state, pages: action.pages, selectedPages: new Set(), splitPoints: [] };

    case 'DELETE_PAGES': {
      const s = pushUndo(state);
      const toDelete = new Set(action.indices);
      const newPages = s.pages.filter((_, i) => !toDelete.has(i));
      // Adjust split points
      const newSplits: number[] = [];
      let offset = 0;
      for (let i = 0; i < s.pages.length; i++) {
        if (toDelete.has(i)) {
          offset++;
        } else if (s.splitPoints.includes(i)) {
          newSplits.push(i - offset);
        }
      }
      return {
        ...s,
        pages: newPages,
        splitPoints: newSplits.filter(sp => sp >= 0 && sp < newPages.length),
        selectedPages: new Set(),
      };
    }

    case 'INSERT_BLANK': {
      const s = pushUndo(state);
      const blank: VirtualPage = {
        id: genId(),
        sourceId: '',
        sourcePageIndex: 0,
        isBlank: true,
      };
      let idx: number;
      if (action.position === 'before') {
        idx = action.afterIndex; // insert at this index (before the page)
      } else {
        idx = action.afterIndex + 1; // insert after this page
      }
      const newPages = [...s.pages.slice(0, idx), blank, ...s.pages.slice(idx)];
      // adjust splits - any split at or after idx gets incremented
      const newSplits = s.splitPoints.map(sp => sp >= idx ? sp + 1 : sp);
      return { ...s, pages: newPages, splitPoints: newSplits };
    }

    case 'MOVE_PAGES': {
      const s = pushUndo(state);
      const indices = [...action.indices].sort((a, b) => a - b);
      const moving = indices.map(i => s.pages[i]);
      const remaining = s.pages.filter((_, i) => !indices.includes(i));
      
      // Calculate adjusted target
      let target = action.targetIndex;
      for (const idx of indices) {
        if (idx < action.targetIndex) target--;
      }
      target = Math.max(0, Math.min(remaining.length, target));
      
      const newPages = [
        ...remaining.slice(0, target),
        ...moving,
        ...remaining.slice(target),
      ];
      return { ...s, pages: newPages, selectedPages: new Set(), splitPoints: [] };
    }

    case 'SELECT_PAGE': {
      // If selection mode is ON, clicking always toggles selection
      if (state.selectionMode) {
        const newSel = new Set(state.selectedPages);
        if (newSel.has(action.index)) {
          newSel.delete(action.index);
        } else {
          newSel.add(action.index);
        }
        return { ...state, selectedPages: newSel, focusedPage: action.index };
      }
      
      // Normal mode: use multi/range logic
      const newSel = new Set(state.selectedPages);
      if (action.multi) {
        if (newSel.has(action.index)) {
          newSel.delete(action.index);
        } else {
          newSel.add(action.index);
        }
      } else if (action.range && state.focusedPage >= 0) {
        const start = Math.min(state.focusedPage, action.index);
        const end = Math.max(state.focusedPage, action.index);
        for (let i = start; i <= end; i++) newSel.add(i);
      } else {
        if (newSel.has(action.index) && newSel.size === 1) {
          newSel.clear();
        } else {
          newSel.clear();
          newSel.add(action.index);
        }
      }
      return { ...state, selectedPages: newSel, focusedPage: action.index };
    }

    case 'SELECT_RANGE': {
      const newSel = new Set(state.selectedPages);
      const start = Math.max(0, Math.min(action.from, action.to));
      const end = Math.min(state.pages.length - 1, Math.max(action.from, action.to));
      for (let i = start; i <= end; i++) newSel.add(i);
      return { ...state, selectedPages: newSel };
    }

    case 'SELECT_ALL': {
      const newSel = new Set<number>();
      state.pages.forEach((_, i) => newSel.add(i));
      return { ...state, selectedPages: newSel };
    }

    case 'DESELECT_ALL':
      return { ...state, selectedPages: new Set() };

    case 'INVERT_SELECTION': {
      const newSel = new Set<number>();
      state.pages.forEach((_, i) => {
        if (!state.selectedPages.has(i)) newSel.add(i);
      });
      return { ...state, selectedPages: newSel };
    }

    case 'SET_FOCUSED':
      return { ...state, focusedPage: action.index };

    case 'ADD_SPLIT': {
      if (state.splitPoints.includes(action.afterIndex)) return state;
      return { ...state, splitPoints: [...state.splitPoints, action.afterIndex].sort((a, b) => a - b) };
    }

    case 'REMOVE_SPLIT': {
      return { ...state, splitPoints: state.splitPoints.filter(sp => sp !== action.afterIndex) };
    }

    case 'TOGGLE_SPLIT': {
      if (state.splitPoints.includes(action.afterIndex)) {
        return { ...state, splitPoints: state.splitPoints.filter(sp => sp !== action.afterIndex) };
      }
      return { ...state, splitPoints: [...state.splitPoints, action.afterIndex].sort((a, b) => a - b) };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const snapshot = state.undoStack[state.undoStack.length - 1];
      const redoSnapshot = { pages: [...state.pages], splitPoints: [...state.splitPoints] };
      return {
        ...state,
        pages: snapshot.pages,
        splitPoints: snapshot.splitPoints,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, redoSnapshot],
        selectedPages: new Set(),
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const snapshot = state.redoStack[state.redoStack.length - 1];
      const undoSnapshot = { pages: [...state.pages], splitPoints: [...state.splitPoints] };
      return {
        ...state,
        pages: snapshot.pages,
        splitPoints: snapshot.splitPoints,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, undoSnapshot],
        selectedPages: new Set(),
      };
    }

    case 'PUSH_UNDO':
      return pushUndo(state);

    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.enabled };

    case 'SET_CUSTOM_OUTLINE':
      return { ...state, customOutline: action.outline };

    default:
      return state;
  }
}

const initialState: State = {
  sourceFiles: [],
  pages: [],
  splitPoints: [],
  selectedPages: new Set(),
  focusedPage: -1,
  selectionMode: false,
  customOutline: null,
  undoStack: [],
  redoStack: [],
};

const StoreContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

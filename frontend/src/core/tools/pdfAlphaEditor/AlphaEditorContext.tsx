import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Change, PageText } from './alphaEditorTypes';
import { changeKey } from './alphaEditorTypes';

interface AlphaEditorState {
  pageTexts: Map<number, PageText>;
  changes: Map<string, Change>;
  loading: boolean;
  error: string | null;
  currentFile: File | null;
}

interface AlphaEditorContextValue {
  state: AlphaEditorState;
  setCurrentFile: (file: File | null) => void;
  setPageTexts: (texts: Map<number, PageText>) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  commit: (change: Change) => void;
  undo: (key: string) => void;
}


const AlphaEditorContext = createContext<AlphaEditorContextValue | null>(null);

export function AlphaEditorProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [pageTexts, setPageTextsState] = useState<Map<number, PageText>>(new Map());
  const [changes, setChanges] = useState<Map<string, Change>>(new Map());
  const [loading, setLoadingState] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [currentFile, setCurrentFileState] = useState<File | null>(null);

  const setCurrentFile = useCallback((file: File | null): void => {
    setCurrentFileState(file);
  }, []);

  const setPageTexts = useCallback((texts: Map<number, PageText>): void => {
    setPageTextsState(texts);
  }, []);

  const setLoading = useCallback((v: boolean): void => {
    setLoadingState(v);
  }, []);

  const setError = useCallback((v: string | null): void => {
    setErrorState(v);
  }, []);

  const commit = useCallback((change: Change): void => {
    const key = changeKey(change.pageIndex, change.originalText, change.bbox);
    setChanges((prev) => new Map(prev).set(key, change));
  }, []);

  const undo = useCallback((key: string): void => {
    setChanges((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const state = useMemo((): AlphaEditorState => ({
    pageTexts,
    changes,
    loading,
    error,
    currentFile,
  }), [pageTexts, changes, loading, error, currentFile]);

  const value = useMemo((): AlphaEditorContextValue => ({
    state,
    setCurrentFile,
    setPageTexts,
    setLoading,
    setError,
    commit,
    undo,
  }), [state, setCurrentFile, setPageTexts, setLoading, setError, commit, undo]);

  return (
    <AlphaEditorContext.Provider value={value}>
      {children}
    </AlphaEditorContext.Provider>
  );
}

export function useAlphaEditor(): AlphaEditorContextValue {
  const ctx = useContext(AlphaEditorContext);
  if (ctx === null) {
    throw new Error('useAlphaEditor must be used within AlphaEditorProvider');
  }
  return ctx;
}

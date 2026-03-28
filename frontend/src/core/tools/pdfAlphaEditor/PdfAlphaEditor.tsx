import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  Button,
  Text,
  Alert,
  Loader,
  ScrollArea,
  Badge,
  ActionIcon,
} from '@mantine/core';
import { useNavigation } from '@app/contexts/NavigationContext';
import { useFileState } from '@app/contexts/FileContext';
import { isStirlingFile, type StirlingFile } from '@app/types/fileContext';
import type { BaseToolProps } from '@app/types/tool';
import { applyAlphaEditorChanges } from './alphaEditorApi';
import { extractPageText } from './alphaEditorTextExtraction';
import { useAlphaEditor } from './AlphaEditorContext';
import styles from './PdfAlphaEditor.module.css';

// ---------------------------------------------------------------------------
// PdfAlphaEditor — sidebar tool component for text editing in PDFs
//
// Note: The AlphaEditorOverlay is wired into the viewer's per-page render
// callback in LocalEmbedPDF.tsx. This component manages state via context
// and renders the sidebar panel only.
// ---------------------------------------------------------------------------

const PdfAlphaEditor = (_props: BaseToolProps): React.ReactElement => {
  const { selectedTool } = useNavigation();
  const { selectors, state: fileState } = useFileState();
  const { state, setCurrentFile, setPageTexts, setLoading, setError, undo } = useAlphaEditor();

  const [saving, setSaving] = useState(false);

  const activeFiles = selectors.getFiles();
  const selectedFileIds = fileState.ui.selectedFileIds;

  const currentFile = useMemo((): StirlingFile | null => {
    if (activeFiles.length === 0) return null;
    if (selectedFileIds.length > 0) {
      const sel = activeFiles.find(
        (f) => isStirlingFile(f) && selectedFileIds.includes(f.fileId),
      );
      if (sel) return sel;
    }
    return activeFiles[0];
  }, [activeFiles, selectedFileIds]);

  useEffect(() => {
    setCurrentFile(currentFile);
    if (!currentFile) return;
    setPageTexts(new Map());
    setError(null);
    setLoading(true);
    extractPageText(currentFile)
      .then((pages) => {
        const map = new Map(pages.map((p) => [p.pageIndex, p]));
        setPageTexts(map);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to extract text');
      })
      .finally(() => setLoading(false));
  }, [currentFile, setCurrentFile, setPageTexts, setLoading, setError]);

  const handleSave = useCallback(async (): Promise<void> => {
    const file = state.currentFile;
    if (!file || state.changes.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await applyAlphaEditorChanges(file, Array.from(state.changes.values()));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '_edited.pdf');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [state.currentFile, state.changes, setError]);

  const isActive = selectedTool === 'pdfAlphaEditor';

  if (!isActive) return <></>;

  const changeEntries = Array.from(state.changes.entries());

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {currentFile && (
          <Text size="xs" className={styles.fileName} title={currentFile.name}>
            {currentFile.name}
          </Text>
        )}

        {!currentFile && (
          <Text size="xs" c="dimmed">
            No file selected.
          </Text>
        )}

        {state.loading && (
          <div className={styles.loaderRow}>
            <Loader size={14} />
            <Text size="xs" c="dimmed">Extracting text…</Text>
          </div>
        )}

        {state.error && (
          <Alert color="red" variant="light" p="xs" radius="sm">
            <Text size="xs">{state.error}</Text>
          </Alert>
        )}

        {!state.loading && !state.error && currentFile && state.pageTexts.size > 0 && (
          <Text size="xs" c="dimmed">
            {state.pageTexts.size} page{state.pageTexts.size !== 1 ? 's' : ''} extracted. Click text in the viewer to edit.
          </Text>
        )}
      </div>

      {changeEntries.length > 0 && (
        <ScrollArea className={styles.changesList}>
          <div className={styles.changesListInner}>
            {changeEntries.map(([key, change]) => (
              <div key={key} className={styles.changeItem}>
                <div className={styles.changeTexts}>
                  <Text size="xs" className={styles.originalText} title={change.originalText}>
                    {change.originalText}
                  </Text>
                  <Text size="xs" className={styles.arrow}>→</Text>
                  <Text size="xs" className={styles.replacementText} title={change.replacementText}>
                    {change.replacementText}
                  </Text>
                  <Badge size="xs" variant="light" color="blue" ml="auto">
                    p{change.pageIndex + 1}
                  </Badge>
                </div>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  className={styles.undoBtn}
                  onClick={() => undo(key)}
                  aria-label="Undo change"
                >
                  ×
                </ActionIcon>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className={styles.footer}>
        <Text size="xs" c="dimmed">
          {state.changes.size} change{state.changes.size !== 1 ? 's' : ''}
        </Text>
        <Button
          size="xs"
          className={styles.saveBtn}
          disabled={state.changes.size === 0 || saving}
          loading={saving}
          onClick={() => void handleSave()}
        >
          Save / Download
        </Button>
      </div>
    </div>
  );
};

export default PdfAlphaEditor;

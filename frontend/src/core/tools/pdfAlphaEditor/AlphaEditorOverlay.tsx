import React, { useState, useCallback, useMemo } from 'react';
import { useDocumentState } from '@embedpdf/core/react';
import type { PageText, TextLine, TextParagraph, TextWord, Rect, Change } from './alphaEditorTypes';
import { changeKey } from './alphaEditorTypes';
import { useAlphaEditor } from './AlphaEditorContext';
import styles from './AlphaEditorOverlay.module.css';

interface AlphaEditorOverlayProps {
  documentId: string;
  pageIndex: number;
  pageText: PageText | null;
  pageWidthPx: number;
  pageHeightPx: number;
}

interface ActiveEdit {
  text: string;
  originalText: string;
  bbox: Rect;
  isMultiline: boolean;
}


function getAllLines(pageText: PageText): { line: TextLine; para: TextParagraph }[] {
  const result: { line: TextLine; para: TextParagraph }[] = [];
  for (const para of pageText.paragraphs) {
    for (const line of para.lines) {
      result.push({ line, para });
    }
  }
  return result;
}

function findWordAtX(line: TextLine, clickX: number, scaleX: number): TextWord | null {
  for (const word of line.words) {
    const cssX = word.bbox.x * scaleX;
    const cssW = word.bbox.w * scaleX;
    if (clickX >= cssX && clickX <= cssX + cssW) {
      return word;
    }
  }
  // Fallback: closest word by center distance
  let closest: TextWord | null = null;
  let minDist = Infinity;
  for (const word of line.words) {
    const center = (word.bbox.x + word.bbox.w / 2) * scaleX;
    const dist = Math.abs(clickX - center);
    if (dist < minDist) {
      minDist = dist;
      closest = word;
    }
  }
  return closest;
}

function lineText(line: TextLine): string {
  return line.words.map((w) => w.text).join(' ');
}

function paraText(para: TextParagraph): string {
  return para.lines.map(lineText).join('\n');
}

export function AlphaEditorOverlay(props: AlphaEditorOverlayProps): React.ReactElement | null {
  const {
    documentId,
    pageIndex,
    pageText,
    pageWidthPx,
    pageHeightPx,
  } = props;
  const { state: { changes }, commit: onCommit } = useAlphaEditor();

  const documentState = useDocumentState(documentId);

  const { scaleX, scaleY } = useMemo(() => {
    const pdfPage = documentState?.document?.pages?.[pageIndex];
    if (!pdfPage?.size || !pageWidthPx || !pageHeightPx) {
      return { scaleX: documentState?.scale ?? 1, scaleY: documentState?.scale ?? 1 };
    }
    return {
      scaleX: pageWidthPx / pdfPage.size.width,
      scaleY: pageHeightPx / pdfPage.size.height,
    };
  }, [documentState, pageIndex, pageWidthPx, pageHeightPx]);

  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null);
  const [hoveredLineIdx, setHoveredLineIdx] = useState<number | null>(null);

  const handleCommit = useCallback(
    (edit: ActiveEdit): void => {
      if (edit.text !== edit.originalText) {
        onCommit({
          pageIndex,
          originalText: edit.originalText,
          replacementText: edit.text,
          bbox: edit.bbox,
        });
      }
      setActiveEdit(null);
    },
    [pageIndex, onCommit],
  );

  const handleCancel = useCallback((): void => {
    setActiveEdit(null);
  }, []);

  const handleBlur = useCallback(
    (edit: ActiveEdit): void => {
      handleCommit(edit);
    },
    [handleCommit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, edit: ActiveEdit): void => {
      if (e.key === 'Enter' && !edit.isMultiline) {
        e.preventDefault();
        handleCommit(edit);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCommit, handleCancel],
  );

  const activateEdit = useCallback(
    (text: string, bbox: Rect, isMultiline: boolean): void => {
      setActiveEdit({ text, originalText: text, bbox, isMultiline });
    },
    [],
  );

  const handleLineClick = useCallback(
    (e: React.MouseEvent, line: TextLine, lineIdx: number): void => {
      e.stopPropagation();
      if (e.detail === 3) return; // triple handled separately
      if (e.detail === 2) {
        const relX = e.nativeEvent.offsetX;
        const word = findWordAtX(line, relX, scaleX);
        if (word) {
          activateEdit(word.text, word.bbox, false);
        }
        return;
      }
      activateEdit(lineText(line), line.bbox, false);
      setHoveredLineIdx(lineIdx);
    },
    [scaleX, activateEdit],
  );

  const handleTripleClick = useCallback(
    (e: React.MouseEvent, para: TextParagraph): void => {
      e.stopPropagation();
      activateEdit(paraText(para), para.bbox, para.lines.length > 1);
    },
    [activateEdit],
  );

  if (pageText === null) {
    return null;
  }

  const allLines = getAllLines(pageText);

  return (
    <div
      className={styles.overlay}
      style={{ width: pageWidthPx, height: pageHeightPx }}
    >
      {allLines.map(({ line, para }, idx) => {
        const cssX = line.bbox.x * scaleX;
        const cssY = line.bbox.y * scaleY;
        const cssW = line.bbox.w * scaleX;
        const cssH = line.bbox.h * scaleY;
        const key = changeKey(pageIndex, lineText(line), line.bbox);
        const isCommitted = changes.has(key);
        const isActive =
          activeEdit !== null &&
          activeEdit.bbox === line.bbox;

        return (
          <span
            key={`line-${idx}`}
            className={[
              styles.lineHit,
              isActive ? styles.lineHitInactive : '',
              isCommitted ? styles.committed : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: cssX,
              top: cssY,
              width: cssW,
              height: cssH,
            }}
            onMouseEnter={(): void => setHoveredLineIdx(idx)}
            onMouseLeave={(): void => setHoveredLineIdx(hoveredLineIdx === idx ? null : hoveredLineIdx)}
            onClick={(e): void => handleLineClick(e, line, idx)}
            onClickCapture={(e): void => {
              if (e.detail >= 3) handleTripleClick(e, para);
            }}
          />
        );
      })}

      {activeEdit !== null && renderActiveEdit(activeEdit, scaleX, scaleY, handleBlur, handleKeyDown, setActiveEdit)}
    </div>
  );
}

function renderEditInput(
  edit: ActiveEdit,
  sharedStyle: React.CSSProperties,
  onBlur: (edit: ActiveEdit) => void,
  onKeyDown: (e: React.KeyboardEvent, edit: ActiveEdit) => void,
  setActiveEdit: React.Dispatch<React.SetStateAction<ActiveEdit | null>>,
): React.ReactElement {
  return (
    <input
      key="active-edit"
      className={styles.editInput}
      style={sharedStyle}
      value={edit.text}
      autoFocus
      onChange={(e) => setActiveEdit({ ...edit, text: e.target.value })}
      onBlur={() => onBlur(edit)}
      onKeyDown={(e) => onKeyDown(e, edit)}
    />
  );
}

function renderEditTextarea(
  edit: ActiveEdit,
  sharedStyle: React.CSSProperties,
  onBlur: (edit: ActiveEdit) => void,
  onKeyDown: (e: React.KeyboardEvent, edit: ActiveEdit) => void,
  setActiveEdit: React.Dispatch<React.SetStateAction<ActiveEdit | null>>,
): React.ReactElement {
  return (
    <textarea
      key="active-edit"
      className={styles.editTextarea}
      style={sharedStyle}
      value={edit.text}
      autoFocus
      onChange={(e) => setActiveEdit({ ...edit, text: e.target.value })}
      onBlur={() => onBlur(edit)}
      onKeyDown={(e) => onKeyDown(e, edit)}
    />
  );
}

function renderActiveEdit(
  edit: ActiveEdit,
  scaleX: number,
  scaleY: number,
  onBlur: (edit: ActiveEdit) => void,
  onKeyDown: (e: React.KeyboardEvent, edit: ActiveEdit) => void,
  setActiveEdit: React.Dispatch<React.SetStateAction<ActiveEdit | null>>,
): React.ReactElement {
  const sharedStyle: React.CSSProperties = {
    left: edit.bbox.x * scaleX,
    top: edit.bbox.y * scaleY,
    width: edit.bbox.w * scaleX,
    height: edit.bbox.h * scaleY,
    '--alpha-edit-font-size': `${edit.bbox.h * scaleY * 0.8}px`,
  } as React.CSSProperties;

  if (edit.isMultiline) {
    return renderEditTextarea(edit, sharedStyle, onBlur, onKeyDown, setActiveEdit);
  }
  return renderEditInput(edit, sharedStyle, onBlur, onKeyDown, setActiveEdit);
}

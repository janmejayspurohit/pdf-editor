import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useDebouncedCallback } from '@mantine/hooks';
import {
  Button,
  Text,
  Alert,
  Switch,
  Loader,
  ScrollArea,
  Progress,
  Tooltip,
  ActionIcon,
  Collapse,
  Select,
  NumberInput,
  ColorInput,
  SegmentedControl,
} from '@mantine/core';
import { useFormFill, useAllFormValues } from '@app/tools/formFill/FormFillContext';
import { useNavigation } from '@app/contexts/NavigationContext';
import { useViewer } from '@app/contexts/ViewerContext';
import { useFileState } from '@app/contexts/FileContext';
import { Skeleton } from '@mantine/core';
import { isStirlingFile, getFormFillFileId, type StirlingFile } from '@app/types/fileContext';
import type { BaseToolProps } from '@app/types/tool';
import type { FormField } from '@app/tools/formFill/types';
import { FieldInput } from '@app/tools/formFill/FieldInput';
import { FIELD_TYPE_ICON, FIELD_TYPE_COLOR } from '@app/tools/formFill/fieldMeta';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DescriptionIcon from '@mui/icons-material/Description';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import {
  extractFormFieldsCsv,
  extractFormFieldsXlsx,
  applyFieldTextStyles,
  type TextStyleOptions,
} from '@app/tools/formFill/formApi';
import { DEFAULT_TEXT_STYLE } from '@app/tools/formFill/FormFillContext';

const FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times', label: 'Times' },
  { value: 'Courier', label: 'Courier' },
];
import styles from '@app/tools/formFill/FormFill.module.css';

// ---------------------------------------------------------------------------
// Main FormFill component
// ---------------------------------------------------------------------------

const FormFill = (_props: BaseToolProps) => {
  const { selectedTool } = useNavigation();
  const { selectors, state: fileState } = useFileState();

  const {
    state: formState,
    fetchFields,
    buildFilledBlob,
    submitForm,
    setValue,
    setActiveField,
    fieldTextStyles,
    setFieldTextStyle,
  } = useFormFill();

  const allValues = useAllFormValues();
  const { validationErrors } = formState;

  const { scrollActions } = useViewer();

  const [flatten, setFlatten] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [styleOpenFor, setStyleOpenFor] = useState<string | null>(null);

  const currentFileRef = useRef<StirlingFile | null>(null);
  const savingRef = useRef(false);

  // Build filled blob (values only) and replace file in context.
  // Text styles stay in context state and are applied fresh at download time.
  const doSave = useCallback(async () => {
    const file = currentFileRef.current;
    if (!file || !isStirlingFile(file)) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const blob = await submitForm(file, false); // marks form clean via MARK_CLEAN
      window.dispatchEvent(new CustomEvent('formfill:apply', { detail: { blob } }));
    } catch (err: any) {
      const message = err?.response?.status === 413
        ? 'File too large. Try reducing the PDF size first.'
        : err?.message || 'Failed to save';
      setSaveError(message);
      console.error('[FormFill] Save failed:', err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [submitForm]);

  // Ctrl+S / Cmd+S → save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doSave]);

  // Auto-save 2 s after the last value change
  const debouncedAutoSave = useDebouncedCallback(() => {
    if (!savingRef.current) doSave();
  }, 2000);

  useEffect(() => {
    if (formState.isDirty) {
      debouncedAutoSave();
    }
  }, [allValues, fieldTextStyles, formState.isDirty]);

  const handleExtractJson = useCallback(() => {
    setExtracting(true);
    try {
      const data = JSON.stringify(allValues, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-data-${new Date().getTime()}.json`;
      a.click();
      // Delay revocation so the browser has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 250);
    } finally {
      setExtracting(false);
    }
  }, [allValues]);
  const activeFieldRef = useRef<HTMLDivElement>(null);

  const activeFiles = selectors.getFiles();

  const selectedFileIds = fileState.ui.selectedFileIds;
  const currentFile = useMemo(() => {
    if (activeFiles.length === 0) return null;
    if (selectedFileIds.length > 0) {
      const sel = activeFiles.find(
        (f) => isStirlingFile(f) && selectedFileIds.includes(f.fileId)
      );
      if (sel) return sel;
    }
    return activeFiles[0];
  }, [activeFiles, selectedFileIds]);

  currentFileRef.current = currentFile;

  const handleExtractCsv = useCallback(async () => {
    if (!currentFile) return;
    setExtracting(true);
    try {
      const blob = await extractFormFieldsCsv(currentFile, allValues);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-data-${new Date().getTime()}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 250);
    } catch (err) {
      console.error('[FormFill] CSV extraction failed:', err);
      setSaveError('Failed to extract CSV');
    } finally {
      setExtracting(false);
    }
  }, [currentFile, allValues]);

  const handleExtractXlsx = useCallback(async () => {
    if (!currentFile) return;
    setExtracting(true);
    try {
      const blob = await extractFormFieldsXlsx(currentFile, allValues);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-data-${new Date().getTime()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 250);
    } catch (err) {
      console.error('[FormFill] XLSX extraction failed:', err);
      setSaveError('Failed to extract XLSX');
    } finally {
      setExtracting(false);
    }
  }, [currentFile, allValues]);

  const isActive = selectedTool === 'formFill';

  useEffect(() => {
    if (formState.activeFieldName && activeFieldRef.current) {
      activeFieldRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [formState.activeFieldName]);

  const handleDownload = useCallback(async () => {
    const file = currentFileRef.current;
    if (!file || !isStirlingFile(file)) return;
    setSaving(true);
    setSaveError(null);
    try {
      let blob = await buildFilledBlob(file, flatten);
      if (Object.keys(fieldTextStyles).length > 0) {
        blob = await applyFieldTextStyles(blob, fieldTextStyles);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 250);
    } catch (err: any) {
      const message = err?.response?.status === 413
        ? 'File too large. Try reducing the PDF size first.'
        : err?.message || 'Failed to build filled form';
      setSaveError(message);
      console.error('[FormFill] Download failed:', err);
    } finally {
      setSaving(false);
    }
  }, [buildFilledBlob, flatten, fieldTextStyles]);

  // Data loss prevention: warn on beforeunload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formState.isDirty]);

  const handleRefresh = useCallback(() => {
    if (currentFile) {
      fetchFields(currentFile, getFormFillFileId(currentFile) ?? undefined);
    }
  }, [currentFile, fetchFields]);

  const handleValueChange = useCallback(
    (fieldName: string, value: string) => {
      setValue(fieldName, value);
    },
    [setValue]
  );

  const handleFieldClick = useCallback(
    (fieldName: string, pageIndex?: number) => {
      setActiveField(fieldName);
      if (pageIndex !== undefined) {
        scrollActions.scrollToPage(pageIndex + 1);
      }
    },
    [setActiveField, scrollActions]
  );

  // Progress tracking
  const fillableFields = useMemo(() => {
    return formState.fields.filter((f) => f.type !== 'button' && f.type !== 'signature');
  }, [formState.fields]);

  // Memoize fillable fields grouped by page (signatures/buttons excluded)
  const { sortedPages, fieldsByPage } = useMemo(() => {
    const byPage = new Map<number, FormField[]>();
    for (const field of fillableFields) {
      const pageIndex =
        field.widgets && field.widgets.length > 0 ? field.widgets[0].pageIndex : 0;
      if (!byPage.has(pageIndex)) {
        byPage.set(pageIndex, []);
      }
      byPage.get(pageIndex)!.push(field);
    }
    const pages = Array.from(byPage.keys()).sort((a, b) => a - b);
    return { sortedPages: pages, fieldsByPage: byPage };
  }, [fillableFields]);

  const fillableCount = fillableFields.length;

  const filledCount = useMemo(() => {
    return fillableFields.filter((f) => {
      const v = allValues[f.name];
      return v && v !== 'Off' && v.trim() !== '';
    }).length;
  }, [fillableFields, allValues]);

  const requiredFields = useMemo(() => {
    return fillableFields.filter((f) => f.required);
  }, [fillableFields]);

  const requiredCount = requiredFields.length;

  const filledRequiredCount = useMemo(() => {
    return requiredFields.filter((f) => {
      const v = allValues[f.name];
      return v && v !== 'Off' && v.trim() !== '';
    }).length;
  }, [requiredFields, allValues]);

  if (!isActive) return null;

  return (
    <div className={styles.root}>
      {/* Header / controls */}
      <div className={styles.header}>
        {/* Loading state */}
        {formState.loading && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader size={14} />
              <Text size="xs" c="dimmed">
                Analysing form fields...
              </Text>
            </div>
            <Skeleton height={48} radius="sm" />
            <Skeleton height={48} radius="sm" />
          </>
        )}

        {/* Error state */}
        {formState.error && (
          <Alert
            icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
            color="red"
            variant="light"
            p="xs"
            radius="sm"
          >
            <Text size="xs">{formState.error}</Text>
          </Alert>
        )}

        {/* Ready state with fields */}
        {!formState.loading && formState.fields.length > 0 && (
          <>
            {/* Progress bar */}
            <div>
              <div className={styles.progressRow}>
                <span className={styles.progressLabel}>
                  {filledCount} / {fillableCount} filled
                  {requiredCount > 0 && (
                    <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                      ({filledRequiredCount}/{requiredCount} req.)
                    </span>
                  )}
                </span>
                <span className={styles.progressLabel}>
                  {fillableCount > 0
                    ? Math.round((filledCount / fillableCount) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={fillableCount > 0 ? (filledCount / fillableCount) * 100 : 0}
                size={6}
                radius="xl"
                color={filledRequiredCount === requiredCount ? 'teal' : 'blue'}
                mt={4}
              />
            </div>

            {/* Flatten toggle */}
            <Switch
              label="Flatten after filling"
              checked={flatten}
              onChange={(e) => setFlatten(e.currentTarget.checked)}
              size="xs"
              styles={{
                label: { fontSize: '0.75rem', cursor: 'pointer' },
              }}
            />

            {/* Action buttons */}
            <div className={styles.actionBar}>
              <div className={styles.primaryActions}>
                <Tooltip label="Re-scan fields" withArrow position="bottom">
                  <ActionIcon
                    variant="light"
                    size="md"
                    onClick={handleRefresh}
                    aria-label="Re-scan form fields"
                  >
                    <RefreshIcon sx={{ fontSize: 16 }} />
                  </ActionIcon>
                </Tooltip>
              </div>

              <div className={styles.secondaryActions}>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<FileDownloadIcon sx={{ fontSize: 14 }} />}
                  loading={extracting}
                  onClick={handleExtractJson}
                  size="xs"
                >
                  JSON
                </Button>

                <Button
                  variant="light"
                  color="blue"
                  leftSection={<FileDownloadIcon sx={{ fontSize: 14 }} />}
                  loading={extracting}
                  onClick={handleExtractCsv}
                  size="xs"
                >
                  CSV
                </Button>

                <Button
                  variant="light"
                  color="blue"
                  leftSection={<FileDownloadIcon sx={{ fontSize: 14 }} />}
                  loading={extracting}
                  onClick={handleExtractXlsx}
                  size="xs"
                >
                  XLSX
                </Button>
              </div>
            </div>

            {/* Error message */}
            {saveError && (
              <Alert color="red" variant="light" p="xs" radius="sm">
                <Text size="xs">{saveError}</Text>
              </Alert>
            )}
          </>
        )}

        {/* Empty state */}
        {!formState.loading && formState.fields.length === 0 && !formState.error && (
          <div className={styles.emptyState}>
            <DescriptionIcon className={styles.emptyStateIcon} />
            <span className={styles.emptyStateText}>
              No fillable form fields found in this PDF.
            </span>
          </div>
        )}
      </div>

      {/* Scrollable field list */}
      {!formState.loading && formState.fields.length > 0 && (
        <ScrollArea className={styles.fieldList}>
          <div className={styles.fieldListInner}>
            {sortedPages.map((pageIdx, i) => (
              <React.Fragment key={pageIdx}>
                <div
                  className={styles.pageDivider}
                  style={i === 0 ? { marginTop: 0 } : undefined}
                >
                  <Text className={styles.pageDividerLabel}>
                    Page {pageIdx + 1}
                  </Text>
                </div>

                {fieldsByPage.get(pageIdx)!.map((field) => {
                  const isFieldActive = formState.activeFieldName === field.name;
                  const hasError = !!validationErrors[field.name];
                  const pageIndex =
                    field.widgets && field.widgets.length > 0
                      ? field.widgets[0].pageIndex
                      : undefined;

                  return (
                    <div
                      key={field.name}
                      ref={isFieldActive ? activeFieldRef : undefined}
                      className={`${styles.fieldCard} ${
                        isFieldActive ? styles.fieldCardActive : ''
                      } ${hasError ? styles.fieldCardError : ''}`}
                      onClick={() => handleFieldClick(field.name, pageIndex)}
                    >
                      <div className={styles.fieldHeader}>
                        <span
                          className={styles.fieldTypeIcon}
                          style={{
                            color: `var(--mantine-color-${FIELD_TYPE_COLOR[field.type]}-6)`,
                            fontSize: '0.875rem',
                          }}
                        >
                          {FIELD_TYPE_ICON[field.type]}
                        </span>
                        <span className={styles.fieldName}>
                          {field.label || field.name}
                        </span>
                        {field.required && (
                          <span className={styles.fieldRequired}>req</span>
                        )}
                        {field.type === 'text' && (
                          <Tooltip label="Text style" withArrow position="left">
                            <ActionIcon
                              size="xs"
                              variant={fieldTextStyles[field.name] ? 'filled' : 'light'}
                              color="blue"
                              ml="auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStyleOpenFor((p) => p === field.name ? null : field.name);
                              }}
                              aria-label="Text style"
                            >
                              <SettingsIcon sx={{ fontSize: 14 }} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </div>

                      {field.type === 'text' && (
                        <Collapse in={styleOpenFor === field.name} onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const s: TextStyleOptions = fieldTextStyles[field.name] ?? DEFAULT_TEXT_STYLE;
                            return (
                              <div className={styles.textStylePanel} style={{ marginTop: '0.375rem' }}>
                                <Select
                                  label="Font"
                                  size="xs"
                                  data={FONT_OPTIONS}
                                  value={s.fontFamily}
                                  onChange={(v) => setFieldTextStyle(field.name, { ...s, fontFamily: v ?? 'Helvetica' })}
                                  allowDeselect={false}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                  <NumberInput
                                    label="Size"
                                    size="xs"
                                    min={4}
                                    max={72}
                                    value={s.fontSize}
                                    onChange={(v) => setFieldTextStyle(field.name, { ...s, fontSize: Number(v) || 12 })}
                                    style={{ flex: 1 }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.25rem', paddingBottom: '0.15rem' }}>
                                    <Tooltip label="Bold" withArrow>
                                      <ActionIcon size="sm" variant="filled" color={s.bold ? 'blue' : 'dark'} onClick={() => setFieldTextStyle(field.name, { ...s, bold: !s.bold })} aria-label="Bold">
                                        <FormatBoldIcon sx={{ fontSize: 14 }} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Italic" withArrow>
                                      <ActionIcon size="sm" variant="filled" color={s.italic ? 'blue' : 'dark'} onClick={() => setFieldTextStyle(field.name, { ...s, italic: !s.italic })} aria-label="Italic">
                                        <FormatItalicIcon sx={{ fontSize: 14 }} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </div>
                                </div>
                                <ColorInput
                                  label="Color"
                                  size="xs"
                                  value={s.textColor}
                                  onChange={(v) => setFieldTextStyle(field.name, { ...s, textColor: v })}
                                  format="hex"
                                  swatches={['#000000', '#1e3a5f', '#c0392b', '#27ae60', '#8e44ad', '#e67e22']}
                                />
                                <div>
                                  <Text size="xs" fw={500} mb={4}>Alignment</Text>
                                  <SegmentedControl size="xs" fullWidth value={s.textAlign} onChange={(v) => setFieldTextStyle(field.name, { ...s, textAlign: v as TextStyleOptions['textAlign'] })} data={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]} />
                                </div>
                                <div>
                                  <Text size="xs" fw={500} mb={4}>Transform</Text>
                                  <SegmentedControl size="xs" fullWidth value={s.textTransform} onChange={(v) => setFieldTextStyle(field.name, { ...s, textTransform: v as TextStyleOptions['textTransform'] })} data={[{ label: 'None', value: 'none' }, { label: 'UPPER', value: 'uppercase' }, { label: 'lower', value: 'lowercase' }]} />
                                </div>
                              </div>
                            );
                          })()}
                        </Collapse>
                      )}

                      {field.type !== 'button' && field.type !== 'signature' && (
                        <div className={styles.fieldInputWrap}>
                          <FieldInput
                            field={field}
                            onValueChange={handleValueChange}
                          />
                        </div>
                      )}

                      {hasError && (
                        <div className={styles.fieldError}>
                          {validationErrors[field.name]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Status bar */}
      {!formState.loading && formState.fields.length > 0 && (
        <div className={styles.statusBar}>
          <span>
            {formState.isDirty && <span className={styles.unsavedDot} />}
            {saving ? 'Saving…' : formState.isDirty ? 'Unsaved changes' : 'Ready'}
          </span>
        </div>
      )}
    </div>
  );
};

export default FormFill;

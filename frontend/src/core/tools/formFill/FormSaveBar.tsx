/**
 * FormSaveBar — floating customization panel for form-filled PDFs.
 *
 * Appears at the top-right of the PDF viewer when the current PDF has
 * fillable form fields. Lets users set per-field text styles and apply/download
 * the filled PDF.
 */
import React, { useCallback, useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  Transition,
  CloseButton,
  Paper,
  Badge,
  Collapse,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Select,
  NumberInput,
  ColorInput,
  SegmentedControl,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import { useFormFill, DEFAULT_TEXT_STYLE } from '@app/tools/formFill/FormFillContext';
import { applyFieldTextStyles } from '@app/tools/formFill/formApi';
import type { TextStyleOptions } from '@app/tools/formFill/formApi';
import styles from '@app/tools/formFill/FormFill.module.css';

const FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times', label: 'Times' },
  { value: 'Courier', label: 'Courier' },
];

interface FormSaveBarProps {
  file: File | Blob | null;
  isFormFillToolActive: boolean;
  onApply?: (filledBlob: Blob) => Promise<void>;
}

export function FormSaveBar({ file, isFormFillToolActive, onApply }: FormSaveBarProps) {
  const { t } = useTranslation();
  const { state, submitForm, fieldTextStyles, setFieldTextStyle } = useFormFill();
  const { fields, isDirty, loading } = state;
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [styleOpenFor, setStyleOpenFor] = useState<string | null>(null);

  // Reset dismissed state when file changes
  const [prevFile, setPrevFile] = useState<File | Blob | null>(null);
  if (file !== prevFile) {
    setPrevFile(file);
    setDismissed(false);
  }

  const buildStyledBlob = useCallback(async (base: Blob): Promise<Blob> => {
    if (Object.keys(fieldTextStyles).length === 0) return base;
    return applyFieldTextStyles(base, fieldTextStyles);
  }, [fieldTextStyles]);

  const handleApply = useCallback(async () => {
    if (!file || applying || saving) return;
    setApplying(true);
    try {
      let blob = await submitForm(file, false);
      blob = await buildStyledBlob(blob);
      if (onApply) await onApply(blob);
    } catch (err) {
      console.error('[FormSaveBar] Apply failed:', err);
    } finally {
      setApplying(false);
    }
  }, [file, applying, saving, submitForm, onApply, buildStyledBlob]);

  const handleDownload = useCallback(async () => {
    if (!file || saving || applying) return;
    setSaving(true);
    try {
      let blob = await submitForm(file, false);
      blob = await buildStyledBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file instanceof File ? file.name : 'filled-form.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[FormSaveBar] Download failed:', err);
    } finally {
      setSaving(false);
    }
  }, [file, saving, applying, submitForm, buildStyledBlob]);

  const textFields = fields.filter(f => f.type === 'text');
  const hasFields = fields.some(f => f.type !== 'signature' && f.type !== 'button');
  const visible = !isFormFillToolActive && hasFields && !loading && !dismissed;

  return (
    <Transition mounted={visible} transition="slide-down" duration={300}>
      {(transStyles) => (
        <div
          style={{
            ...transStyles,
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <Paper
            shadow="lg"
            radius="md"
            withBorder
            style={{
              pointerEvents: 'auto',
              width: '22rem',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Group justify="space-between" wrap="nowrap" px="md" py="sm">
              <Group gap="sm" wrap="nowrap">
                <TextFieldsIcon
                  sx={{
                    fontSize: 22,
                    color: 'var(--mantine-color-blue-6)',
                  }}
                />
                <div>
                  <Text size="sm" fw={600}>
                    {t('viewer.formBar.title', 'Customize Form Fields')}
                  </Text>
                  {isDirty && (
                    <Badge size="xs" color="blue" variant="light" mt={2}>
                      {t('viewer.formBar.unsavedBadge', 'Unsaved changes')}
                    </Badge>
                  )}
                </div>
              </Group>
              <CloseButton
                size="sm"
                variant="subtle"
                onClick={() => setDismissed(true)}
                aria-label={t('viewer.formBar.dismiss', 'Dismiss')}
              />
            </Group>

            {/* Per-field style controls */}
            {textFields.length > 0 && (
              <ScrollArea mah="55vh" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <div style={{ padding: '0.25rem 0' }}>
                  {textFields.map((field) => {
                    const isOpen = styleOpenFor === field.name;
                    const s: TextStyleOptions = fieldTextStyles[field.name] ?? DEFAULT_TEXT_STYLE;
                    const hasCustomStyle = !!fieldTextStyles[field.name];

                    return (
                      <div key={field.name} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                        <Group
                          px="md"
                          py="xs"
                          justify="space-between"
                          wrap="nowrap"
                          style={{ cursor: 'default' }}
                        >
                          <Text size="xs" fw={500} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {field.label || field.name}
                          </Text>
                          <Tooltip label="Text style" withArrow position="left">
                            <ActionIcon
                              size="xs"
                              variant={hasCustomStyle ? 'filled' : 'subtle'}
                              color={hasCustomStyle ? 'blue' : 'gray'}
                              onClick={() => setStyleOpenFor((prev) => prev === field.name ? null : field.name)}
                              aria-label="Toggle text style"
                            >
                              <TextFormatIcon sx={{ fontSize: 12 }} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>

                        <Collapse in={isOpen}>
                          <div className={styles.textStylePanel} style={{ margin: '0 0.75rem 0.75rem' }}>
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
                                  <ActionIcon
                                    size="sm"
                                    variant={s.bold ? 'filled' : 'light'}
                                    color={s.bold ? 'blue' : 'gray'}
                                    onClick={() => setFieldTextStyle(field.name, { ...s, bold: !s.bold })}
                                    aria-label="Bold"
                                  >
                                    <FormatBoldIcon sx={{ fontSize: 14 }} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Italic" withArrow>
                                  <ActionIcon
                                    size="sm"
                                    variant={s.italic ? 'filled' : 'light'}
                                    color={s.italic ? 'blue' : 'gray'}
                                    onClick={() => setFieldTextStyle(field.name, { ...s, italic: !s.italic })}
                                    aria-label="Italic"
                                  >
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
                              <SegmentedControl
                                size="xs"
                                fullWidth
                                value={s.textAlign}
                                onChange={(v) => setFieldTextStyle(field.name, { ...s, textAlign: v as TextStyleOptions['textAlign'] })}
                                data={[
                                  { label: 'Left', value: 'left' },
                                  { label: 'Center', value: 'center' },
                                  { label: 'Right', value: 'right' },
                                ]}
                              />
                            </div>
                            <div>
                              <Text size="xs" fw={500} mb={4}>Transform</Text>
                              <SegmentedControl
                                size="xs"
                                fullWidth
                                value={s.textTransform}
                                onChange={(v) => setFieldTextStyle(field.name, { ...s, textTransform: v as TextStyleOptions['textTransform'] })}
                                data={[
                                  { label: 'None', value: 'none' },
                                  { label: 'UPPER', value: 'uppercase' },
                                  { label: 'lower', value: 'lowercase' },
                                ]}
                              />
                            </div>
                          </div>
                        </Collapse>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Apply / Download */}
            {isDirty && (
              <Group gap="xs" px="md" py="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <Button
                  size="sm"
                  variant="light"
                  color="blue"
                  leftSection={<SaveIcon sx={{ fontSize: 18 }} />}
                  loading={applying}
                  disabled={saving}
                  onClick={handleApply}
                  flex={1}
                >
                  {t('viewer.formBar.apply', 'Apply Changes')}
                </Button>
                <Button
                  size="sm"
                  variant="filled"
                  color="blue"
                  leftSection={<DownloadIcon sx={{ fontSize: 18 }} />}
                  loading={saving}
                  disabled={applying}
                  onClick={handleDownload}
                  flex={1}
                >
                  {t('viewer.formBar.download', 'Download PDF')}
                </Button>
              </Group>
            )}
          </Paper>
        </div>
      )}
    </Transition>
  );
}

export default FormSaveBar;

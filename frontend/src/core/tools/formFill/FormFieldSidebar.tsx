import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Text,
  ScrollArea,
  Badge,
  Collapse,
  Tooltip,
  ActionIcon,
  Select,
  NumberInput,
  ColorInput,
  SegmentedControl,
} from '@mantine/core';
import { useFormFill, DEFAULT_TEXT_STYLE } from '@app/tools/formFill/FormFillContext';
import { FieldInput } from '@app/tools/formFill/FieldInput';
import { FIELD_TYPE_ICON, FIELD_TYPE_COLOR } from '@app/tools/formFill/fieldMeta';
import type { FormField } from '@app/tools/formFill/types';
import type { TextStyleOptions } from '@app/tools/formFill/formApi';
import CloseIcon from '@mui/icons-material/Close';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import styles from '@app/tools/formFill/FormFill.module.css';

const FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica (Sans-serif)' },
  { value: 'Times', label: 'Times (Serif)' },
  { value: 'Courier', label: 'Courier (Monospace)' },
];

interface FormFieldSidebarProps {
  visible: boolean;
  onToggle: () => void;
}

export function FormFieldSidebar({
  visible,
  onToggle,
}: FormFieldSidebarProps) {
  const { state, setValue, setActiveField, fieldTextStyles, setFieldTextStyle } = useFormFill();
  const { fields, activeFieldName, loading } = state;
  const activeFieldRef = useRef<HTMLDivElement>(null);
  const [styleOpenFor, setStyleOpenFor] = useState<string | null>(null);

  useEffect(() => {
    if (activeFieldName && activeFieldRef.current) {
      activeFieldRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeFieldName]);

  const handleFieldClick = useCallback(
    (fieldName: string) => {
      setActiveField(fieldName);
    },
    [setActiveField]
  );

  const handleValueChange = useCallback(
    (fieldName: string, value: string) => {
      setValue(fieldName, value);
    },
    [setValue]
  );

  if (!visible) return null;

  const fieldsByPage = new Map<number, FormField[]>();
  for (const field of fields) {
    const pageIndex =
      field.widgets && field.widgets.length > 0 ? field.widgets[0].pageIndex : 0;
    if (!fieldsByPage.has(pageIndex)) {
      fieldsByPage.set(pageIndex, []);
    }
    fieldsByPage.get(pageIndex)!.push(field);
  }
  const sortedPages = Array.from(fieldsByPage.keys()).sort((a, b) => a - b);

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '18.5rem',
        height: '100%',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-toolbar, var(--mantine-color-body))',
        borderLeft: '1px solid var(--border-subtle, var(--mantine-color-default-border))',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 0.75rem',
          borderBottom: '1px solid var(--border-subtle, var(--mantine-color-default-border))',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TextFieldsIcon sx={{ fontSize: 18, opacity: 0.7 }} />
          <Text fw={600} size="sm">
            Form Fields
          </Text>
          <Badge size="xs" variant="light" color="blue" radius="sm">
            {fields.length}
          </Badge>
        </div>
        <ActionIcon variant="subtle" size="sm" onClick={onToggle} aria-label="Close sidebar">
          <CloseIcon sx={{ fontSize: 16 }} />
        </ActionIcon>
      </div>

      {/* Content */}
      <ScrollArea style={{ flex: 1 }}>
        {loading && (
          <div className={styles.emptyState}>
            <Text size="sm" c="dimmed">
              Loading form fields...
            </Text>
          </div>
        )}

        {!loading && fields.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateText}>
              No form fields found in this PDF
            </span>
          </div>
        )}

        {!loading && fields.length > 0 && (
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
                  const isActive = activeFieldName === field.name;

                  return (
                    <div
                      key={field.name}
                      ref={isActive ? activeFieldRef : undefined}
                      className={`${styles.fieldCard} ${
                        isActive ? styles.fieldCardActive : ''
                      }`}
                      onClick={() => handleFieldClick(field.name)}
                    >
                      <div className={styles.fieldHeader}>
                        <Tooltip label={field.type} withArrow position="left">
                          <span
                            className={styles.fieldTypeIcon}
                            style={{
                              color: `var(--mantine-color-${FIELD_TYPE_COLOR[field.type]}-6)`,
                              fontSize: '0.875rem',
                            }}
                          >
                            {FIELD_TYPE_ICON[field.type]}
                          </span>
                        </Tooltip>
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
                              variant={fieldApplyTextStyle[field.name] ? 'filled' : 'subtle'}
                              color={fieldApplyTextStyle[field.name] ? 'blue' : 'gray'}
                              ml="auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStyleOpenFor((prev) => prev === field.name ? null : field.name);
                              }}
                              aria-label="Toggle text style"
                            >
                              <TextFormatIcon sx={{ fontSize: 12 }} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </div>

                      {field.type !== 'button' && field.type !== 'signature' && (
                        <div className={styles.fieldInputWrap}>
                          <FieldInput
                            field={field}
                            onValueChange={handleValueChange}
                          />
                        </div>
                      )}

                      {field.type === 'text' && (
                        <Collapse in={styleOpenFor === field.name} onClick={(e) => e.stopPropagation()}>
                          <div className={styles.textStylePanel}>
                            {(() => {
                              const s = fieldTextStyles[field.name] ?? DEFAULT_TEXT_STYLE;
                              const enabled = true;
                              return (
                                <>
                                  <Select
                                    label="Font"
                                    size="xs"
                                    data={FONT_OPTIONS}
                                    value={s.fontFamily}
                                    onChange={(v) => setFieldTextStyle(field.name, { ...s, fontFamily: v ?? 'Helvetica' })}
                                    allowDeselect={false}
                                    disabled={!enabled}
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
                                      disabled={!enabled}
                                    />
                                    <div style={{ display: 'flex', gap: '0.25rem', paddingBottom: '0.15rem' }}>
                                      <Tooltip label="Bold" withArrow>
                                        <ActionIcon size="sm" variant={s.bold ? 'filled' : 'light'} color={s.bold ? 'blue' : 'gray'} onClick={() => setFieldTextStyle(field.name, { ...s, bold: !s.bold })} aria-label="Bold" disabled={!enabled}>
                                          <FormatBoldIcon sx={{ fontSize: 14 }} />
                                        </ActionIcon>
                                      </Tooltip>
                                      <Tooltip label="Italic" withArrow>
                                        <ActionIcon size="sm" variant={s.italic ? 'filled' : 'light'} color={s.italic ? 'blue' : 'gray'} onClick={() => setFieldTextStyle(field.name, { ...s, italic: !s.italic })} aria-label="Italic" disabled={!enabled}>
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
                                    disabled={!enabled}
                                  />
                                  <div>
                                    <Text size="xs" fw={500} mb={4}>Alignment</Text>
                                    <SegmentedControl size="xs" fullWidth value={s.textAlign} onChange={(v) => setFieldTextStyle(field.name, { ...s, textAlign: v as TextStyleOptions['textAlign'] })} data={[{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }]} disabled={!enabled} />
                                  </div>
                                  <div>
                                    <Text size="xs" fw={500} mb={4}>Transform</Text>
                                    <SegmentedControl size="xs" fullWidth value={s.textTransform} onChange={(v) => setFieldTextStyle(field.name, { ...s, textTransform: v as TextStyleOptions['textTransform'] })} data={[{ label: 'None', value: 'none' }, { label: 'UPPER', value: 'uppercase' }, { label: 'lower', value: 'lowercase' }]} disabled={!enabled} />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </Collapse>
                      )}

                      {field.tooltip && (
                        <div className={styles.fieldHint}>
                          {field.tooltip}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </ScrollArea>
    </Box>
  );
}

export default FormFieldSidebar;

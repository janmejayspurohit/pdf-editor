import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Text,
  ScrollArea,
  Badge,
  Tooltip,
  ActionIcon,
  Switch,
  Collapse,
  Select,
  NumberInput,
  ColorInput,
  SegmentedControl,
} from '@mantine/core';
import { useFormFill } from '@app/tools/formFill/FormFillContext';
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
  const { state, setValue, setActiveField, textStyle, setTextStyle, applyTextStyle, setApplyTextStyle } = useFormFill();
  const { fields, activeFieldName, loading } = state;
  const activeFieldRef = useRef<HTMLDivElement>(null);
  const [textStyleOpen, setTextStyleOpen] = useState(false);

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

      {/* Text style section */}
      <div
        style={{
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--border-subtle, var(--mantine-color-default-border))',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Switch
            label="Apply text style on save"
            checked={applyTextStyle}
            onChange={(e) => {
              setApplyTextStyle(e.currentTarget.checked);
              if (e.currentTarget.checked) setTextStyleOpen(true);
            }}
            size="xs"
            styles={{ label: { fontSize: '0.75rem', cursor: 'pointer' } }}
          />
          {applyTextStyle && (
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={() => setTextStyleOpen((o) => !o)}
              aria-label="Toggle text style panel"
            >
              <TextFormatIcon sx={{ fontSize: 14 }} />
            </ActionIcon>
          )}
        </div>

        <Collapse in={applyTextStyle && textStyleOpen}>
          <div className={styles.textStylePanel}>
            <Select
              label="Font"
              size="xs"
              data={FONT_OPTIONS}
              value={textStyle.fontFamily}
              onChange={(v) => setTextStyle({ ...textStyle, fontFamily: v ?? 'Helvetica' })}
              allowDeselect={false}
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <NumberInput
                label="Size"
                size="xs"
                min={4}
                max={72}
                value={textStyle.fontSize}
                onChange={(v) => setTextStyle({ ...textStyle, fontSize: Number(v) || 12 })}
                style={{ flex: 1 }}
              />
              <div style={{ display: 'flex', gap: '0.25rem', paddingBottom: '0.15rem' }}>
                <Tooltip label="Bold" withArrow>
                  <ActionIcon
                    size="sm"
                    variant={textStyle.bold ? 'filled' : 'light'}
                    color={textStyle.bold ? 'blue' : 'gray'}
                    onClick={() => setTextStyle({ ...textStyle, bold: !textStyle.bold })}
                    aria-label="Bold"
                  >
                    <FormatBoldIcon sx={{ fontSize: 14 }} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Italic" withArrow>
                  <ActionIcon
                    size="sm"
                    variant={textStyle.italic ? 'filled' : 'light'}
                    color={textStyle.italic ? 'blue' : 'gray'}
                    onClick={() => setTextStyle({ ...textStyle, italic: !textStyle.italic })}
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
              value={textStyle.textColor}
              onChange={(v) => setTextStyle({ ...textStyle, textColor: v })}
              format="hex"
              swatches={['#000000', '#1e3a5f', '#c0392b', '#27ae60', '#8e44ad', '#e67e22']}
            />
            <div>
              <Text size="xs" fw={500} mb={4}>Alignment</Text>
              <SegmentedControl
                size="xs"
                fullWidth
                value={textStyle.textAlign}
                onChange={(v) =>
                  setTextStyle({ ...textStyle, textAlign: v as TextStyleOptions['textAlign'] })
                }
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
                value={textStyle.textTransform}
                onChange={(v) =>
                  setTextStyle({ ...textStyle, textTransform: v as TextStyleOptions['textTransform'] })
                }
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
                      </div>

                      {field.type !== 'button' && field.type !== 'signature' && (
                        <div
                          className={styles.fieldInputWrap}
                        >
                          <FieldInput
                            field={field}
                            onValueChange={handleValueChange}
                          />
                        </div>
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

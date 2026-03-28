/**
 * API service for form-related backend calls.
 */
import apiClient from '@app/services/apiClient';
import type { FormField } from '@app/tools/formFill/types';

/**
 * Fetch form fields with coordinates from the backend.
 * Calls POST /api/v1/form/fields-with-coordinates
 */
export async function fetchFormFieldsWithCoordinates(
  file: File | Blob
): Promise<FormField[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<FormField[]>(
    '/api/v1/form/fields-with-coordinates',
    formData
  );
  return response.data;
}

/**
 * Fill form fields and get back a filled PDF blob.
 * Calls POST /api/v1/form/fill
 */
export async function fillFormFields(
  file: File | Blob,
  values: Record<string, string>,
  flatten: boolean = false,
  signatureImages?: Record<string, string>,
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append(
    'data',
    new Blob([JSON.stringify(values)], { type: 'application/json' })
  );
  formData.append('flatten', String(flatten));
  if (signatureImages && Object.keys(signatureImages).length > 0) {
    formData.append(
      'signatureImages',
      new Blob([JSON.stringify(signatureImages)], { type: 'application/json' })
    );
  }

  const response = await apiClient.post('/api/v1/form/fill', formData, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Extract form fields as CSV.
 * Calls POST /api/v1/form/extract-csv
 */
export async function extractFormFieldsCsv(
  file: File | Blob,
  values?: Record<string, string>
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  if (values) {
    formData.append(
      'data',
      new Blob([JSON.stringify(values)], { type: 'application/json' })
    );
  }

  const response = await apiClient.post('/api/v1/form/extract-csv', formData, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Apply text style to all text fields in a PDF.
 * Bakes the DA (default appearance) string into the AcroForm so styling
 * is recognised by Adobe Acrobat and other PDF readers.
 * Calls POST /api/v1/misc/apply-form-text-style
 */
export interface TextStyleOptions {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  bold: boolean;
  italic: boolean;
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export async function applyFormTextStyle(
  file: File | Blob,
  style: TextStyleOptions
): Promise<Blob> {
  const formData = new FormData();
  formData.append('fileInput', file);
  formData.append('fontFamily', style.fontFamily);
  formData.append('fontSize', String(style.fontSize));
  formData.append('textColor', style.textColor);
  formData.append('bold', String(style.bold));
  formData.append('italic', String(style.italic));
  formData.append('textAlign', style.textAlign);
  formData.append('textTransform', style.textTransform);
  formData.append('applyToAll', 'true');

  const response = await apiClient.post('/api/v1/misc/apply-form-text-style', formData, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Apply per-field text styles and get back a styled PDF blob.
 * Calls POST /api/v1/misc/apply-field-text-styles
 */
export async function applyFieldTextStyles(
  file: File | Blob,
  fieldStyles: Record<string, TextStyleOptions>
): Promise<Blob> {
  const formData = new FormData();
  formData.append('fileInput', file);
  formData.append('fieldStyles', JSON.stringify(fieldStyles));

  const response = await apiClient.post('/api/v1/misc/apply-field-text-styles', formData, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Extract form fields as XLSX.
 * Calls POST /api/v1/form/extract-xlsx
 */
export async function extractFormFieldsXlsx(
  file: File | Blob,
  values?: Record<string, string>
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', file);
  if (values) {
    formData.append(
      'data',
      new Blob([JSON.stringify(values)], { type: 'application/json' })
    );
  }

  const response = await apiClient.post('/api/v1/form/extract-xlsx', formData, {
    responseType: 'blob',
  });
  return response.data;
}


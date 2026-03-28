import { Change, PageCharData } from './alphaEditorTypes';

export async function extractTextPositions(file: File): Promise<PageCharData[]> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch('/api/v1/pdf/alpha-editor/extract-text', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`extractTextPositions failed: ${response.status}`);
  }

  return response.json() as Promise<PageCharData[]>;
}

export async function applyAlphaEditorChanges(file: File, changes: Change[]): Promise<Blob> {
  const form = new FormData();
  form.append('file', file);
  form.append('changes', JSON.stringify(changes));

  const response = await fetch('/api/v1/pdf/alpha-editor/apply', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`applyAlphaEditorChanges failed: ${response.status}`);
  }

  return response.blob();
}

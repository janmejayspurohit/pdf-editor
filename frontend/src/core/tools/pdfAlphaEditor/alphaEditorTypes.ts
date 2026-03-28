export interface TextChar {
  charIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  ch: string;
}

export interface Rect { x: number; y: number; w: number; h: number; }

export interface TextWord { chars: TextChar[]; text: string; bbox: Rect; }
export interface TextLine { words: TextWord[]; bbox: Rect; }
export interface TextParagraph { lines: TextLine[]; bbox: Rect; }

export interface PageText {
  pageIndex: number;
  paragraphs: TextParagraph[];
}

export interface Change {
  pageIndex: number;
  originalText: string;
  replacementText: string;
  bbox: Rect;
}

export interface PageCharData {
  pageIndex: number;
  chars: TextChar[];
}

export function changeKey(pageIndex: number, originalText: string, bbox: Rect): string {
  return `${pageIndex}:${originalText}:${Math.round(bbox.x)}-${Math.round(bbox.y)}-${Math.round(bbox.w)}-${Math.round(bbox.h)}`;
}

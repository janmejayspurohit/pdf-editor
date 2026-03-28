import { PageCharData, PageText, Rect, TextChar, TextLine, TextParagraph, TextWord } from './alphaEditorTypes';
import { extractTextPositions } from './alphaEditorApi';

function unionBbox(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

function charToRect(c: TextChar): Rect {
  return { x: c.x, y: c.y, w: c.w, h: c.h };
}

function groupIntoYBands(chars: TextChar[]): TextChar[][] {
  const sorted = [...chars].sort((a, b) => a.y - b.y || a.x - b.x);
  const bands: TextChar[][] = [];
  let current: TextChar[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    if (Math.abs(sorted[i].y - prev.y) <= 2) {
      current.push(sorted[i]);
    } else {
      bands.push(current);
      current = [sorted[i]];
    }
  }
  bands.push(current);
  return bands;
}

function bandToWords(band: TextChar[]): TextWord[] {
  const visible = band.filter(c => c.ch.trim() !== '');
  if (visible.length === 0) return [];

  const sorted = [...visible].sort((a, b) => a.x - b.x);
  const avgCharWidth = sorted.reduce((sum, c) => sum + c.w, 0) / sorted.length;
  const gap = avgCharWidth * 2;

  const words: TextWord[] = [];
  let current: TextChar[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.x - (prev.x + prev.w) > gap) {
      words.push(buildWord(current));
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  words.push(buildWord(current));
  return words;
}

function charsToWords(chars: TextChar[]): TextWord[] {
  if (chars.length === 0) return [];
  const bands = groupIntoYBands(chars);
  return bands.flatMap(bandToWords);
}

function buildWord(chars: TextChar[]): TextWord {
  const bbox = chars.map(charToRect).reduce(unionBbox);
  return { chars, text: chars.map(c => c.ch).join(''), bbox };
}

function wordsToLines(words: TextWord[]): TextLine[] {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
  const lines: TextLine[] = [];
  let current: TextWord[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    const curr = sorted[i];
    if (Math.abs(curr.bbox.y - prev.bbox.y) <= 2) {
      current.push(curr);
    } else {
      lines.push(buildLine(current));
      current = [curr];
    }
  }
  lines.push(buildLine(current));
  return lines;
}

function buildLine(words: TextWord[]): TextLine {
  const sorted = [...words].sort((a, b) => a.bbox.x - b.bbox.x);
  const bbox = sorted.map(w => w.bbox).reduce(unionBbox);
  return { words: sorted, bbox };
}

function linesToParagraphs(lines: TextLine[]): TextParagraph[] {
  if (lines.length === 0) return [];

  const avgLineHeight = lines.reduce((sum, l) => sum + l.bbox.h, 0) / lines.length;
  const maxGap = avgLineHeight * 1.5;

  const paragraphs: TextParagraph[] = [];
  let current: TextLine[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prev = current[current.length - 1];
    const curr = lines[i];
    const gap = curr.bbox.y - (prev.bbox.y + prev.bbox.h);
    if (gap <= maxGap) {
      current.push(curr);
    } else {
      paragraphs.push(buildParagraph(current));
      current = [curr];
    }
  }
  paragraphs.push(buildParagraph(current));
  return paragraphs;
}

function buildParagraph(lines: TextLine[]): TextParagraph {
  const bbox = lines.map(l => l.bbox).reduce(unionBbox);
  return { lines, bbox };
}

export async function extractPageText(file: File): Promise<PageText[]> {
  const pages: PageCharData[] = await extractTextPositions(file);
  return pages.map(page => {
    const words = charsToWords(page.chars);
    const lines = wordsToLines(words);
    const paragraphs = linesToParagraphs(lines);
    return { pageIndex: page.pageIndex, paragraphs };
  });
}

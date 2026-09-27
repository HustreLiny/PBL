import { CHAPTER_ORDER, type ChapterId, type ItemId } from '../../types';
import { P0 } from './p0';
import { C1 } from './c1';
import { C2 } from './c2';
import { C3 } from './c3';
import { C4 } from './c4';
import { C5 } from './c5';
import { C6 } from './c6';
import type { ChapterDef, QuestionDef } from './types';

export const CHAPTERS: Record<ChapterId, ChapterDef> = { p0: P0, c1: C1, c2: C2, c3: C3, c4: C4, c5: C5, c6: C6 };

export const chapterIndex = (id: ChapterId) => CHAPTER_ORDER.indexOf(id);
export const nextChapter = (id: ChapterId): ChapterId | null => CHAPTER_ORDER[chapterIndex(id) + 1] ?? null;

/** 直接从某章开始时，默认已有的条目：前面各章的 core 之和 */
export const snapshotBefore = (id: ChapterId): ItemId[] =>
  CHAPTER_ORDER.slice(0, chapterIndex(id)).flatMap((c) => CHAPTERS[c].core);

/** 直接从某章开始时，默认已提过的建议 */
export const suggestionsBefore = (id: ChapterId): string[] => (chapterIndex(id) > chapterIndex('c1') ? ['fetal', 'neuro'] : []);

export const ALL_QUESTIONS: Record<string, QuestionDef> = Object.fromEntries(
  CHAPTER_ORDER.flatMap((c) => CHAPTERS[c].questions.map((q) => [q.id, q])),
);

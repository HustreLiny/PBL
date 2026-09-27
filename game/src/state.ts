import { CHAPTER_ORDER, type Answers, type ChapterId, type Claim, type ItemId, type LedgerEntry, type Phase, type QuestionId } from './types';
import type { Line } from './data/story';
import { MAX_ASK, exhausted } from './data/story';
import type { Column, MdtResult } from './data/ch5';
import { CHAPTERS, nextChapter, snapshotBefore, suggestionsBefore } from './data/chapters';
import type { Mark } from './data/chapters/c3';
import { replyTo, SUGGESTIONS } from './data/suggestions';
import type { QuestionVerdict } from './engine/grade';

export const SAVE_KEY = 'pbl-save-v4';

export interface GameState {
  phase: Phase;
  chapter: ChapterId;
  /** 从哪一章开始玩的；结局只统计玩过的章节 */
  startChapter: ChapterId;
  scene: string;
  collected: ItemId[];
  openedReports: string[];
  /** 本章每个话题问过几次 */
  askCount: Record<string, number>;
  itemNotes: Record<ItemId, string>;
  notes: string;
  answers: Answers;
  /** 本章作答到第几题；等于题数表示汇报完成 */
  reportStep: number;
  attempts: Record<QuestionId, number>;
  verdicts: Record<QuestionId, QuestionVerdict>;
  hints: Record<QuestionId, number>;
  /** 本章已用的师姐补充（序号） */
  seniorHintsUsed: number[];
  /** 本章是否已及时上报 */
  emergency: boolean;
  ledger: LedgerEntry[];
  dialog: Line[];
  afterDialog: Phase | null;
  /** 汇报中正在为哪条论点选证据；此时点信息板条目即加入 */
  selecting: { q: QuestionId; key: string } | null;
  suggestions: string[];
  flags: Record<string, boolean>;
  board: { hyps: string[]; marks: Record<string, Mark> };
  mdtRound: number;
  mdtResults: MdtResult[];
  order: Record<string, Column>;
  talkNode: number;
  talkChoices: number[];
  /** 本次洽谈的患者评价变化 */
  talkDelta: number;
  talkTries: number;
  talkDone: boolean;
  /** 操作说明是否打开；开始游戏时自动弹出 */
  help: boolean;
  /** 本章入口快照，用于“重来本章”（设计稿 11.2） */
  entry: Omit<GameState, 'entry'> | null;
}

let keySeq = 0;
export const newClaim = (card: string): Claim => ({
  key: `c${Date.now().toString(36)}${(keySeq++).toString(36)}`,
  card,
  evidence: [],
  timing: null,
});

/** 每章开始时重置的字段 */
const chapterFresh = (chapter: ChapterId) => ({
  chapter,
  phase: 'explore' as Phase,
  scene: CHAPTERS[chapter].startScene,
  openedReports: [] as string[],
  askCount: {},
  reportStep: 0,
  seniorHintsUsed: [],
  emergency: false,
  selecting: null,
  mdtRound: 0,
  mdtResults: [],
  order: {},
  talkNode: 0,
  talkChoices: [],
  talkDelta: 0,
  talkTries: 0,
  talkDone: false,
});

export function initialState(): GameState {
  return {
    ...chapterFresh('p0'),
    phase: 'title',
    startChapter: 'p0',
    collected: [],
    itemNotes: {},
    notes: '',
    answers: {},
    attempts: {},
    verdicts: {},
    hints: {},
    ledger: [],
    dialog: [],
    afterDialog: null,
    suggestions: [],
    flags: {},
    board: { hyps: [], marks: {} },
    help: false,
    entry: null,
  };
}

const withEntry = (st: GameState): GameState => {
  const { entry: _drop, ...rest } = st;
  return { ...st, entry: rest };
};

export type Msg =
  | { t: 'start'; chapter: ChapterId; suggested: boolean }
  | { t: 'reset' }
  | { t: 'restartChapter' }
  | { t: 'help'; on: boolean }
  | { t: 'nextChapter' }
  | { t: 'scene'; scene: string }
  | { t: 'openReport'; id: string }
  | { t: 'collect'; id: ItemId }
  | { t: 'ask'; topic: string }
  | { t: 'suggest'; id: string }
  | { t: 'itemNote'; id: ItemId; text: string }
  | { t: 'notes'; text: string }
  | { t: 'dialogNext' }
  | { t: 'say'; lines: Line[]; after?: Phase }
  | { t: 'emergency'; items: ItemId[] }
  | { t: 'phase'; phase: Phase }
  | { t: 'answers'; answers: Answers }
  | { t: 'select'; target: GameState['selecting'] }
  | { t: 'hint'; q: QuestionId }
  | { t: 'seniorHint'; index: number }
  | { t: 'submitQ'; q: QuestionId; verdict: QuestionVerdict; claims: Claim[] }
  | { t: 'reportDone' }
  | { t: 'boardHyp'; hyp: string }
  | { t: 'boardMark'; cell: string }
  | { t: 'mdtRound'; result: MdtResult; lines: Line[] }
  | { t: 'order'; order: Record<string, Column>; crash: boolean; perfect: boolean; lines: Line[] }
  | { t: 'talk'; choice: number; patient: number; clinical: number; lines: Line[] };

const HINT_COST = [0.5, 1, 2];
const MDT_SCORE: Record<MdtResult, number> = { persuade: 1, partial: 0, none: -1, crash: -3 };
const MARK_CYCLE: (Mark | null)[] = [null, '能解释', '解释不了', '说不准'];

const addItems = (have: ItemId[], add: ItemId[]) => [...have, ...add.filter((x) => !have.includes(x))];

export function reducer(s: GameState, m: Msg): GameState {
  const ch = CHAPTERS[s.chapter];
  const log = (kind: string, clinical: number, patient: number, note: string): LedgerEntry[] => [
    ...s.ledger,
    { kind, clinical, patient, note, chapter: s.chapter },
  ];
  switch (m.t) {
    case 'start': {
      const base = initialState();
      const collected = snapshotBefore(m.chapter);
      const late = CHAPTER_ORDER.indexOf(m.chapter) > CHAPTER_ORDER.indexOf('c2');
      const suggested = m.suggested && late;
      const st: GameState = {
        ...base,
        ...chapterFresh(m.chapter),
        startChapter: m.chapter,
        help: true,
        collected,
        suggestions: suggestionsBefore(m.chapter),
        flags: suggested ? { suspectTma: true } : {},
        ledger: suggested
          ? [{ kind: '提前识别', clinical: 2, patient: 0, note: '第二章已提出 TMA／TTP 怀疑并建议相关检查', chapter: 'c2' }]
          : [],
      };
      return withEntry({ ...st, dialog: CHAPTERS[m.chapter].opening(st) });
    }
    case 'reset':
      return initialState();
    case 'restartChapter':
      return s.entry ? { ...s.entry, help: false, entry: s.entry } : s;
    case 'help':
      return { ...s, help: m.on };
    case 'nextChapter': {
      const next = nextChapter(s.chapter);
      if (!next) return { ...s, phase: 'ending' };
      const st: GameState = { ...s, ...chapterFresh(next), afterDialog: null };
      return withEntry({ ...st, dialog: CHAPTERS[next].opening(st) });
    }
    case 'scene':
      return { ...s, scene: m.scene };
    case 'openReport':
      return s.openedReports.includes(m.id) ? s : { ...s, openedReports: [...s.openedReports, m.id] };
    case 'collect':
      return { ...s, collected: addItems(s.collected, [m.id]) };
    case 'ask': {
      const topic = ch.topics.find((x) => x.id === m.topic);
      if (!topic) return s;
      const n = s.askCount[topic.id] ?? 0;
      const who = Object.values(ch.scenes).flatMap((sc) => sc.hotspots).find((h) => h.id === topic.person)?.who ?? '旁白';
      if (n >= MAX_ASK) return { ...s, dialog: [exhausted(who)] };
      return { ...s, askCount: { ...s.askCount, [topic.id]: n + 1 }, dialog: topic.lines };
    }
    case 'suggest': {
      const r = replyTo(m.id, s);
      return {
        ...s,
        suggestions: s.suggestions.includes(m.id) ? s.suggestions : [...s.suggestions, m.id],
        flags: r.flag ? { ...s.flags, [r.flag]: true } : s.flags,
        ledger: r.ledger ? [...s.ledger, { ...r.ledger, chapter: s.chapter }] : s.ledger,
        dialog: [{ who: '你', text: `我建议：${SUGGESTION_LABEL(m.id)}。` }, ...r.lines],
      };
    }
    case 'itemNote':
      return { ...s, itemNotes: { ...s.itemNotes, [m.id]: m.text } };
    case 'notes':
      return { ...s, notes: m.text };
    case 'dialogNext': {
      const rest = s.dialog.slice(1);
      if (rest.length === 0 && s.afterDialog) return { ...s, dialog: rest, phase: s.afterDialog, afterDialog: null };
      return { ...s, dialog: rest };
    }
    case 'say':
      return { ...s, dialog: m.lines, afterDialog: m.after ?? null };
    case 'emergency': {
      const groups = ch.emergencyGroups ?? [];
      const timely = !s.emergency && m.items.some((id) => groups.includes(id.split('.')[0]));
      const lines: Line[] =
        m.items.length === 0
          ? [{ who: '师姐', text: '什么情况？你把依据指给我看。' }]
          : [{ who: '师姐', text: '好，我马上跟主任说。你尽快把汇报整理好，到时候讲。' }];
      return {
        ...s,
        emergency: s.emergency || timely,
        ledger: timely ? log('及时上报', 1, 0, '汇报前带着关键证据报告紧急情况') : s.ledger,
        dialog: lines,
      };
    }
    case 'phase':
      return { ...s, phase: m.phase, selecting: null };
    case 'answers':
      return { ...s, answers: m.answers };
    case 'select':
      return { ...s, selecting: m.target };
    case 'hint': {
      const lv = s.hints[m.q] ?? 0;
      if (lv >= 3) return s;
      return {
        ...s,
        hints: { ...s.hints, [m.q]: lv + 1 },
        ledger: log('请教', -HINT_COST[lv], 0, `${m.q} 第 ${lv + 1} 级`),
      };
    }
    case 'seniorHint': {
      const h = ch.seniorHints[m.index];
      if (!h || s.seniorHintsUsed.includes(m.index)) return s;
      return {
        ...s,
        seniorHintsUsed: [...s.seniorHintsUsed, m.index],
        collected: addItems(s.collected, h.items.map((i) => i.id)),
        ledger: log('协助', 0, 0, `师姐补充：${h.text}`),
        dialog: [
          { who: '师姐', text: h.text },
          { who: '师姐', text: '我当时也在，记下来了，给你。' },
        ],
      };
    }
    case 'submitQ': {
      const n = (s.attempts[m.q] ?? 0) + 1;
      const pass = m.verdict.result === 'pass';
      const tag = { chapter: s.chapter };
      let ledger = s.ledger;
      let flags = s.flags;
      if (n > 1) ledger = [...ledger, { kind: '修改重交', clinical: -1, patient: 0, note: `${m.q} 第 ${n} 次提交`, ...tag }];
      if (m.verdict.crash) ledger = [...ledger, { kind: '翻车', clinical: -3, patient: 0, note: `${m.q} 的处置会引发严重后果`, ...tag }];
      if (pass && n === 1) ledger = [...ledger, { kind: '首次通过', clinical: 1, patient: 0, note: `${m.q} 首次提交即通过`, ...tag }];
      const bonus = pass ? ch.onPass?.(m.q, m.claims, s) : null;
      if (bonus) {
        flags = { ...flags, [bonus.flag]: true };
        ledger = [...ledger, { ...bonus.entry, ...tag }];
      }
      return {
        ...s,
        attempts: { ...s.attempts, [m.q]: n },
        verdicts: { ...s.verdicts, [m.q]: m.verdict },
        reportStep: pass ? s.reportStep + 1 : s.reportStep,
        selecting: null,
        ledger,
        flags,
      };
    }
    case 'reportDone': {
      const a = ch.afterReport;
      return {
        ...s,
        collected: addItems(s.collected, a.collect ?? []),
        dialog: a.lines,
        afterDialog: a.next,
        phase: a.lines.length ? s.phase : a.next,
      };
    }
    case 'boardHyp': {
      const on = s.board.hyps.includes(m.hyp);
      const hyps = on ? s.board.hyps.filter((h) => h !== m.hyp) : [...s.board.hyps, m.hyp];
      const marks = on
        ? Object.fromEntries(Object.entries(s.board.marks).filter(([k]) => !k.startsWith(`${m.hyp}|`)))
        : s.board.marks;
      return { ...s, board: { hyps, marks } };
    }
    case 'boardMark': {
      const cur = s.board.marks[m.cell] ?? null;
      const nextMark = MARK_CYCLE[(MARK_CYCLE.indexOf(cur) + 1) % MARK_CYCLE.length];
      const marks = { ...s.board.marks };
      if (nextMark) marks[m.cell] = nextMark;
      else delete marks[m.cell];
      return { ...s, board: { ...s.board, marks } };
    }
    case 'mdtRound': {
      const i = s.mdtRound;
      return {
        ...s,
        mdtResults: [...s.mdtResults, m.result],
        mdtRound: i + 1,
        ledger: log(m.result === 'crash' ? '翻车' : 'MDT', MDT_SCORE[m.result], 0, `MDT 第 ${i + 1} 轮`),
        dialog: m.lines,
      };
    }
    case 'order': {
      let ledger = s.ledger;
      if (m.crash) ledger = log('翻车', -3, 0, '把血浆置换放到结果回报后');
      else if (m.perfect) ledger = log('MDT', 1, 0, '行动时序安排清楚');
      return { ...s, order: m.order, ledger, dialog: m.lines, afterDialog: 'talk' };
    }
    case 'talk': {
      const talk = ch.talk;
      if (!talk) return s;
      let ledger =
        m.patient !== 0 || m.clinical !== 0 ? log('洽谈', m.clinical, m.patient, `${talk.title}第 ${s.talkNode + 1} 个节点`) : s.ledger;
      const delta = s.talkDelta + m.patient;
      const base = { ...s, talkChoices: [...s.talkChoices, m.choice], talkNode: s.talkNode + 1, talkDelta: delta };
      if (s.talkNode < talk.nodes.length - 1) return { ...base, ledger, dialog: m.lines };
      const f = talk.finish(base, delta);
      ledger = [...ledger, ...(f.ledger ?? []).map((e) => ({ ...e, chapter: s.chapter }))];
      const retry = f.next === 'talk';
      return {
        ...base,
        ledger,
        collected: addItems(s.collected, f.collect ?? []),
        dialog: [...m.lines, ...f.lines],
        afterDialog: f.next,
        talkNode: retry ? 0 : base.talkNode,
        talkDelta: retry ? 0 : delta,
        talkTries: s.talkTries + 1,
        talkDone: !retry,
      };
    }
  }
}

const SUGGESTION_LABEL = (id: string) => SUGGESTIONS.find((x) => x.id === id)?.label ?? id;

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...initialState(), ...JSON.parse(raw) };
  } catch {
    /* 存档损坏时重新开始 */
  }
  return initialState();
}

export const sumLedger = (l: LedgerEntry[]) => ({
  clinical: l.reduce((a, e) => a + e.clinical, 0),
  patient: l.reduce((a, e) => a + e.patient, 0),
});

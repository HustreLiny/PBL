import type { ChapterId, Claim, Item, ItemId, LedgerEntry, Phase, QuestionId } from '../../types';
import type { QuestionSpec } from '../../engine/spec';
import type { Line, SceneDef, TalkNode, Topic } from '../story';
import type { GameState } from '../../state';

export type CardColor = 'trend' | 'overall' | 'mech' | 'dx' | 'test' | 'tx';

export interface CardGroup {
  category: string;
  color: CardColor;
  cards: string[];
}

export interface QuestionDef {
  id: QuestionId;
  title: string;
  /** 本题显示哪些卡类 */
  categories: string[];
  /** 是否显示时序标签 */
  timing?: boolean;
  hints: [string, string, string];
  /** 兜底意见：规则给不出具体意见时使用 */
  insufficient: string;
  /** 无 spec 的题目（第五章）用 grade.ts 中的手写规则 */
  spec?: QuestionSpec;
}

export interface RevealDef {
  title: string;
  items: Item[];
  note: string;
  next: 'chapterEnd' | 'ending';
}

export interface TalkFinish {
  lines: Line[];
  /** 洽谈结束后去哪里；'talk' 表示重新谈一次 */
  next: Phase;
  ledger?: LedgerEntry[];
  collect?: ItemId[];
}

export interface ChapterDef {
  id: ChapterId;
  no: string;
  title: string;
  scenes: Record<string, SceneDef>;
  startScene: string;
  topics: Topic[];
  opening: (s: GameState) => Line[];
  /** 师姐菜单里“出发汇报”的说法 */
  exitLabel: string;
  /** 还不能汇报时，师姐的提示；null 表示可以走 */
  blockers: (s: GameState) => Line[] | null;
  /** 这些条目还没收集时，师姐问“都问完了吗” */
  optionalItems?: ItemId[];
  goLines: Line[];
  questions: QuestionDef[];
  cards: CardGroup[];
  /** 汇报中师姐的补充：只针对问诊、查体里没点取的信息 */
  seniorHints: { text: string; items: Item[] }[];
  /** 汇报全部通过后 */
  afterReport: { lines: Line[]; next: 'mdt' | 'reveal' | 'chapterEnd'; collect?: ItemId[] };
  onPass?: (q: QuestionId, claims: Claim[], s: GameState) => { flag: string; entry: LedgerEntry } | null;
  reveal?: RevealDef;
  talk?: {
    title: string;
    nodes: TalkNode[];
    finish: (s: GameState, delta: number) => TalkFinish;
    /** 探索中开始洽谈前的检查；返回提示对白表示还不能谈 */
    gate?: (s: GameState) => Line[] | null;
  };
  crashCorrection?: string;
  /** 带着这些组的条目报告紧急情况，记为及时上报 */
  emergencyGroups?: string[];
  /** 完成本章后默认已有的条目，用于从后面的章节直接开始 */
  core: ItemId[];
  /** 本章满分参考，用于结局档位 */
  ideal: { clinical: number; patient: number };
  endLine: string;
}

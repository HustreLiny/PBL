/** 信息条目 ID：`组.序号` 或 `组.名称`，组即设计稿中的证据编号（如 E21） */
export type ItemId = string;

export interface Item {
  id: ItemId;
  /** 设计稿证据编号，判定按组引用 */
  group: string;
  /** 条目名称；检验单上未点开时只显示名称 */
  name: string;
  value: string;
  /** 病程时点，与玩家获得顺序无关 */
  time: string;
  source: string;
}

export const groupOf = (id: ItemId) => id.split('.')[0];

export type Timing = '立即' | '治疗前' | '同时进行' | '结果回报后';
export const TIMINGS: Timing[] = ['立即', '治疗前', '同时进行', '结果回报后'];

/** 一张概念卡就是一个论点；加入的条目即视为支持该论点的论据 */
export interface Claim {
  key: string;
  card: string;
  evidence: ItemId[];
  /** 仅处置类问题使用 */
  timing: Timing | null;
}

export type ChapterId = 'p0' | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6';
export const CHAPTER_ORDER: ChapterId[] = ['p0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

/** 如 'Q1.1'、'Q5.3' */
export type QuestionId = string;
export type Answers = Record<QuestionId, Claim[]>;

export interface LedgerEntry {
  kind: string;
  clinical: number;
  patient: number;
  note: string;
  chapter?: ChapterId;
}

export type Phase = 'title' | 'explore' | 'report' | 'mdt' | 'talk' | 'reveal' | 'chapterEnd' | 'ending';

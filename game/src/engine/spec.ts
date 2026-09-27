import { groupOf, type Claim } from '../types';

// 声明式判定规则（附录 E.13）。第五章仍用 grade.ts / feedback.ts 中的手写规则。
// 一卡一论点；论点上挂的条目即“支持”论据。

export interface Support {
  /** 每个内层数组里至少命中一组；外层数组全部要命中。组可写成 E09，也可写成具体条目 E21.PLT */
  groups: string[][];
  /** 上级意见里描述应该用哪类资料 */
  where: string;
}

export interface WrongRule {
  cards: string[];
  /** [第一次意见, 第二次起的更具体意见] */
  text: [string, string];
  crash?: boolean;
}

export interface NeedRule {
  /** 至少 min 张（默认 1）有合格论据的卡 */
  cards: string[];
  min?: number;
  text: [string, string];
}

export interface QuestionSpec {
  support: Record<string, Support>;
  wrong: WrongRule[];
  need: NeedRule[];
}

export interface SpecFeedback {
  keys: string[];
  kind: 'wrong' | 'missing';
  text: string;
}

const hit = (c: Claim, xs: string[]) => c.evidence.some((id) => xs.includes(id) || xs.includes(groupOf(id)));

export function isSupported(spec: QuestionSpec, c: Claim) {
  const s = spec.support[c.card];
  return !s || s.groups.every((xs) => hit(c, xs));
}

/** 挂了论据，但论据说明不了这张卡 */
const mismatched = (spec: QuestionSpec, c: Claim) => c.evidence.length > 0 && !isSupported(spec, c);

const needMet = (spec: QuestionSpec, claims: Claim[], n: NeedRule) =>
  claims.filter((c) => n.cards.includes(c.card) && isSupported(spec, c)).length >= (n.min ?? 1);

export function gradeSpec(spec: QuestionSpec, claims: Claim[]) {
  const wrong = spec.wrong.filter((w) => claims.some((c) => w.cards.includes(c.card)));
  const crash = wrong.some((w) => w.crash);
  const pass =
    wrong.length === 0 && !claims.some((c) => mismatched(spec, c)) && spec.need.every((n) => needMet(spec, claims, n));
  return { pass, crash };
}

const pick = (level: number, [l1, l2]: [string, string]) => (level >= 2 ? l2 : l1);

/** 先指出有问题的论点，再指出缺失的方向；一次只说最要紧的一条 */
export function feedbackSpec(spec: QuestionSpec, claims: Claim[], level: number): SpecFeedback | null {
  for (const w of spec.wrong) {
    const bad = claims.filter((c) => w.cards.includes(c.card));
    if (bad.length) return { keys: bad.map((c) => c.key), kind: 'wrong', text: pick(level, w.text) };
  }
  const mis = claims.filter((c) => mismatched(spec, c));
  if (mis.length) {
    const where = spec.support[mis[0].card].where;
    return {
      keys: mis.map((c) => c.key),
      kind: 'wrong',
      text: pick(level, ['标出来的论点，挂的论据说明不了它。', `这条论据的时点或内容不对，应该用${where}。`]),
    };
  }
  for (const n of spec.need) {
    if (needMet(spec, claims, n)) continue;
    const bare = claims.filter((c) => n.cards.includes(c.card) && c.evidence.length === 0);
    if (bare.length) {
      const where = spec.support[bare[0].card]?.where ?? '信息板上的相关条目';
      return {
        keys: bare.map((c) => c.key),
        kind: 'wrong',
        text: pick(level, ['标出来的这个判断，依据是什么？', `给它挂上${where}作为依据。`]),
      };
    }
    return { keys: [], kind: 'missing', text: pick(level, n.text) };
  }
  return null;
}

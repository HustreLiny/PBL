import { groupOf, type Claim, type QuestionId } from '../types';
import type { Column, MdtResult, MdtRoundId } from '../data/ch5';
import { IDEAL_ORDER } from '../data/ch5';
import { ALL_QUESTIONS } from '../data/chapters';
import { gradeSpec } from './spec';

// 附录 E.4 的可执行判定规则。只拖入证据而未标关系的，不算有效证据。

export type QResult = 'pass' | 'insufficient' | 'empty';

// 一卡一论点；论点上挂的条目即“支持”论据（附录 E.11）
const withEvidence = (c: Claim, groups: string[]) => c.evidence.some((id) => groups.includes(groupOf(id)));
const cardsOf = (claims: Claim[]) => claims.map((c) => c.card);

const DANGER_TRENDS = ['血红蛋白继续下降', '血小板仍严重减低', '肌酐继续升高', '出现蛋白尿', '仍发热', '仍头痛'];
const FALSE_SAFE = ['整体已经好转', '病情稳定可观察'];
const LATER = ['E21', 'E22', 'E23'];

export function checkQ51(claims: Claim[]): boolean {
  const r1 = claims.some((c) => ['局部改善', '胆红素下降', '胆道梗阻已缓解'].includes(c.card) && withEvidence(c, ['E19', 'E20']));
  const r2 =
    claims.some((c) => c.card === '整体仍危险' && withEvidence(c, LATER)) ||
    claims.filter((c) => DANGER_TRENDS.includes(c.card) && withEvidence(c, LATER)).length >= 2;
  const r3 = !claims.some((c) => FALSE_SAFE.includes(c.card));
  return r1 && r2 && r3;
}

export function checkQ52(claims: Claim[]): boolean {
  const r1 = claims.some((c) => ['微血管病性溶血（MAHA）', '溶血持续'].includes(c.card) && withEvidence(c, ['E23']));
  const r2 = claims.some((c) => c.evidence.includes('E21.PLT'));
  const r3 = claims.some((c) => ['TMA', '疑似 TTP'].includes(c.card));
  return r1 && r2 && r3;
}

export function checkQ53(claims: Claim[]) {
  const cards = cardsOf(claims);
  const r1 = cards.includes('治疗前取血送 ADAMTS13 活性') || cards.includes('ADAMTS13 抑制物／抗体');
  const hasPex = cards.includes('血浆置换');
  const r2 = hasPex && (cards.includes('糖皮质激素') || cards.includes('联系血液科'));
  const waits =
    cards.includes('等 ADAMTS13 回报再定') || claims.some((c) => c.card === '血浆置换' && c.timing === '结果回报后');
  const missing = !hasPex && !cards.includes('联系血液科');
  return { pass: r1 && r2 && !waits, crash: waits || missing };
}

export interface QuestionVerdict {
  result: QResult;
  crash: boolean;
}

/** 逐题评判：玩家一次提交一题（设计稿附录 E.11） */
export function gradeQuestion(q: QuestionId, claims: Claim[]): QuestionVerdict {
  if (claims.length === 0) return { result: 'empty', crash: false };
  const spec = ALL_QUESTIONS[q]?.spec;
  if (spec) {
    const v = gradeSpec(spec, claims);
    return { result: v.pass ? 'pass' : 'insufficient', crash: v.crash };
  }
  if (q === 'Q5.1') return { result: checkQ51(claims) ? 'pass' : 'insufficient', crash: false };
  if (q === 'Q5.2') return { result: checkQ52(claims) ? 'pass' : 'insufficient', crash: false };
  const v = checkQ53(claims);
  return { result: v.pass ? 'pass' : 'insufficient', crash: v.crash };
}

// ---------- MDT ----------

/** played 中既有概念卡，也有信息条目 ID；条目按组匹配 */
export function judgeMdt(round: MdtRoundId, played: string[]): MdtResult {
  const tokens = new Set([...played, ...played.map(groupOf)]);
  const has = (x: string) => tokens.has(x);
  const any = (xs: string[]) => xs.some(has);
  switch (round) {
    case 'hema':
      if (has('等 ADAMTS13 回报再定')) return 'crash';
      if (has('E23') && has('E21') && any(['高度怀疑', '治疗前取血送 ADAMTS13 活性'])) return 'persuade';
      if (any(['E23', 'E21'])) return 'partial';
      return 'none';
    case 'icu':
      if (has('整体已经好转')) return 'none';
      if (has('E22') && any(['肾脏受累', '神经系统受累'])) return 'persuade';
      if (has('E22')) return 'partial';
      return 'none';
    case 'gi':
      if (has('再次 ERCP')) return 'none';
      if (any(['E19', 'E20']) && any(['TMA', '疑似 TTP', '微血管病性溶血（MAHA）', '溶血持续'])) return 'persuade';
      if (any(['E19', 'E20'])) return 'partial';
      return 'none';
    case 'ob':
      if (has('先终止妊娠再治疗')) return 'none';
      if (has('产科评估与协调') && has('同时进行')) return 'persuade';
      if (has('产科评估与协调')) return 'partial';
      return 'none';
  }
}

export interface OrderVerdict {
  crash: boolean;
  samplingLate: boolean;
  matches: number;
}

const COL_INDEX: Record<Column, number> = { now: 0, parallel: 1, after: 2 };

export function judgeOrder(order: Record<string, Column>): OrderVerdict {
  const pex = order['血浆置换'];
  const sample = order['治疗前取血送 ADAMTS13 活性'];
  const crash = pex === 'after';
  const samplingLate = COL_INDEX[sample] > COL_INDEX[pex];
  const matches = Object.entries(IDEAL_ORDER).filter(([k, v]) => order[k] === v).length;
  return { crash, samplingLate, matches };
}

// ---------- 结算档位（E.8、E.13，临时） ----------

export type Tier = '好' | '中' | '坏';
/** ideal 为玩过的各章满分参考之和；没有可评的内容时按“好”处理 */
export const clinicalTier = (s: number, ideal: number): Tier =>
  ideal <= 0 ? '好' : s >= ideal * 0.65 ? '好' : s >= ideal * 0.2 ? '中' : '坏';
export const patientTier = (s: number, ideal: number): Tier =>
  ideal <= 0 ? (s >= 0 ? '好' : '中') : s >= ideal * 0.7 ? '好' : s >= ideal * 0.15 ? '中' : '坏';

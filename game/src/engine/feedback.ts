import { groupOf, type Claim, type QuestionId } from '../types';
import { ALL_QUESTIONS } from '../data/chapters';
import { feedbackSpec } from './spec';

// 上级医师意见（附录 E.12）：先指出有问题的论点，再指出缺失的方向；一次只说最要紧的一条。
// level 1 给方向；同一题第二次起仍未过关时用 level 2，更具体。

export interface Feedback {
  /** 有问题的论点，界面上会标出来；缺失类意见为空 */
  keys: string[];
  kind: 'wrong' | 'missing';
  text: string;
}

const pick = (level: number, l1: string, l2: string) => (level >= 2 ? l2 : l1);
const groupsOf = (c: Claim) => c.evidence.map(groupOf);
const hasGroup = (c: Claim, gs: string[]) => groupsOf(c).some((g) => gs.includes(g));

/** 论点缺少合适时点的论据：没挂论据，或只挂了更早时点的条目 */
function unsupported(claims: Claim[], cards: string[], groups: string[], level: number, where: string): Feedback | null {
  const bad = claims.filter((c) => cards.includes(c.card) && !hasGroup(c, groups));
  if (bad.length === 0) return null;
  const empty = bad.every((c) => c.evidence.length === 0);
  return {
    keys: bad.map((c) => c.key),
    kind: 'wrong',
    text: empty
      ? pick(level, '标出来的这个判断，依据是什么？', `给它挂上${where}的结果作为依据。`)
      : pick(level, '标出来的论点，挂的论据说明不了它。', `这条论据的时点或内容不对，应该用${where}的结果。`),
  };
}

const IMPROVE = ['局部改善', '胆红素下降', '胆道梗阻已缓解'];
const DANGER = ['整体仍危险', '血红蛋白继续下降', '血小板仍严重减低', '肌酐继续升高', '出现蛋白尿', '仍发热', '仍头痛'];
const FALSE_SAFE = ['整体已经好转', '病情稳定可观察'];
const LATER = ['E21', 'E22', 'E23'];

function q51(claims: Claim[], level: number): Feedback | null {
  const safe = claims.filter((c) => FALSE_SAFE.includes(c.card));
  if (safe.length)
    return {
      keys: safe.map((c) => c.key),
      kind: 'wrong',
      text: pick(level, '这个结论我不同意。别只看胆红素，把这次复查的结果都看一遍。', 'HGB、PLT 这些指标跟着好转了吗？'),
    };
  const f1 = unsupported(claims, IMPROVE, ['E19', 'E20'], level, '引流后胆红素或 ERCP');
  if (f1) return f1;
  const f2 = unsupported(claims, DANGER, LATER, level, '引流后');
  if (f2) return f2;
  if (!claims.some((c) => IMPROVE.includes(c.card)))
    return { keys: [], kind: 'missing', text: pick(level, '引流本身有没有效果？这一点也要说清楚。', '术后胆红素有什么变化？') };
  const dangers = claims.filter((c) => DANGER.includes(c.card));
  if (!dangers.some((c) => c.card === '整体仍危险') && dangers.length < 2)
    return {
      keys: [],
      kind: 'missing',
      text:
        dangers.length === 0
          ? pick(level, '好的一面你说了。有没有哪些指标并没有跟着好转？', '看看引流后的血常规、肾功能和症状。')
          : pick(level, '还有别的危险信号吗？或者把它们概括成一个整体判断。', '血常规、肾功能、症状里不止一处在变坏。'),
    };
  return null;
}

function q52(claims: Claim[], level: number): Feedback | null {
  const mech = ['微血管病性溶血（MAHA）', '溶血持续'];
  const f = unsupported(claims, mech, ['E23'], level, '网织红或涂片');
  if (f) return f;
  if (!claims.some((c) => mech.includes(c.card)))
    return { keys: [], kind: 'missing', text: pick(level, '贫血还在加重，机制是什么？', '红细胞是在哪里、怎么被破坏的？') };
  if (!claims.some((c) => c.evidence.includes('E21.PLT')))
    return { keys: [], kind: 'missing', text: pick(level, '血小板的情况，你放进判断里了吗？', '把引流后的 PLT 挂到相关论点上。') };
  if (!claims.some((c) => ['TMA', '疑似 TTP'].includes(c.card)))
    return {
      keys: [],
      kind: 'missing',
      text: pick(level, '这些机制合在一起，指向什么诊断？', '溶血加血小板减少，再加器官受累，想想是哪一类疾病。'),
    };
  return null;
}

function q53(claims: Claim[], level: number): Feedback | null {
  const wait = claims.filter((c) => c.card === '等 ADAMTS13 回报再定' || (c.card === '血浆置换' && c.timing === '结果回报后'));
  if (wait.length) return { keys: wait.map((c) => c.key), kind: 'wrong', text: '不能等结果。标出来的这一条要改。' };
  const cards = claims.map((c) => c.card);
  if (!cards.includes('治疗前取血送 ADAMTS13 活性') && !cards.includes('ADAMTS13 抑制物／抗体'))
    return { keys: [], kind: 'missing', text: pick(level, '确诊要靠什么检查？标本什么时候留？', '检查动作里，有一项要在治疗前留好标本。') };
  if (!cards.includes('血浆置换'))
    return { keys: [], kind: 'missing', text: pick(level, '如果真是这个病，治疗上最要紧的是什么？', '什么办法能同时清除抗体、补充缺乏的酶？') };
  if (!cards.includes('糖皮质激素') && !cards.includes('联系血液科'))
    return { keys: [], kind: 'missing', text: pick(level, '还需要谁马上参与？或者配合什么药物？', '联系专科，或者配合免疫抑制的药物。') };
  return null;
}

export function feedbackFor(q: QuestionId, claims: Claim[], level: number): Feedback | null {
  const spec = ALL_QUESTIONS[q]?.spec;
  if (spec) return feedbackSpec(spec, claims, level);
  if (q === 'Q5.1') return q51(claims, level);
  if (q === 'Q5.2') return q52(claims, level);
  return q53(claims, level);
}

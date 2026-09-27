import { describe, expect, it } from 'vitest';
import type { Claim, ItemId } from '../types';
import { feedbackFor } from './feedback';
import { gradeQuestion } from './grade';

const c = (card: string, evidence: ItemId[] = []): Claim => ({ key: card, card, evidence, timing: null });

describe('上级医师意见', () => {
  it('错误结论：标出该论点', () => {
    const f = feedbackFor('Q5.1', [c('局部改善', ['E20.TBil']), c('整体已经好转')], 1)!;
    expect(f.kind).toBe('wrong');
    expect(f.keys).toEqual(['整体已经好转']);
  });
  it('论点挂了急诊的旧结果：标出该论点并说明时点不对', () => {
    const f = feedbackFor('Q5.1', [c('局部改善', ['E09.1']), c('整体仍危险', ['E21.HGB'])], 2)!;
    expect(f.keys).toEqual(['局部改善']);
    expect(f.text).toContain('时点');
  });
  it('缺少危险方面：给方向，不标论点', () => {
    const f = feedbackFor('Q5.1', [c('局部改善', ['E20.TBil'])], 1)!;
    expect(f).toMatchObject({ kind: 'missing', keys: [] });
  });
  it('第二次起意见更具体', () => {
    const a = feedbackFor('Q5.2', [c('疑似 TTP')], 1)!.text;
    const b = feedbackFor('Q5.2', [c('疑似 TTP')], 2)!.text;
    expect(a).not.toBe(b);
  });
  it('未过关的答案一定有具体意见', () => {
    const cases: [Parameters<typeof gradeQuestion>[0], Claim[]][] = [
      ['Q5.1', [c('局部改善', ['E20.TBil']), c('血红蛋白继续下降', ['E21.HGB'])]],
      ['Q5.1', [c('整体仍危险', ['E21.PLT'])]],
      ['Q5.2', [c('微血管病性溶血（MAHA）', ['E23.Smear']), c('疑似 TTP')]],
      ['Q5.3', [c('治疗前取血送 ADAMTS13 活性'), c('血浆置换')]],
    ];
    for (const [q, cl] of cases) {
      expect(gradeQuestion(q, cl).result).toBe('insufficient');
      expect(feedbackFor(q, cl, 1)).not.toBeNull();
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { Claim, ItemId, Timing } from '../types';
import { gradeQuestion, judgeMdt, judgeOrder } from './grade';

const c = (card: string, evidence: ItemId[] = [], timing: Timing | null = null): Claim => ({
  key: Math.random().toString(),
  card,
  evidence,
  timing,
});

describe('Q5.1 病情有何变化', () => {
  it('局部改善＋整体仍危险，各附证据：通过', () => {
    expect(gradeQuestion('Q5.1', [c('局部改善', ['E20.TBil']), c('整体仍危险', ['E21.HGB', 'E21.PLT'])]).result).toBe('pass');
  });
  it('用两个危险趋势论点代替“整体仍危险”：通过', () => {
    expect(
      gradeQuestion('Q5.1', [c('胆红素下降', ['E20.TBil']), c('血红蛋白继续下降', ['E21.HGB']), c('血小板仍严重减低', ['E21.PLT'])]).result,
    ).toBe('pass');
  });
  it('认为整体已经好转：需补充', () => {
    expect(gradeQuestion('Q5.1', [c('局部改善', ['E20.TBil']), c('整体已经好转', ['E20.TBil'])]).result).toBe('insufficient');
  });
  it('论点没有论据：需补充（T05）', () => {
    expect(gradeQuestion('Q5.1', [c('局部改善'), c('整体仍危险')]).result).toBe('insufficient');
  });
  it('LD 下降但仍异常可以接受（T07）', () => {
    expect(
      gradeQuestion('Q5.1', [c('局部改善', ['E20.TBil']), c('整体仍危险', ['E21.PLT']), c('LD 下降但仍异常', ['E21.LD'])]).result,
    ).toBe('pass');
  });
  it('空白记为未作答（T06）', () => {
    expect(gradeQuestion('Q5.1', []).result).toBe('empty');
  });
});

describe('Q5.2 目前诊断是什么', () => {
  it('MAHA＋涂片、引用 PLT、疑似 TTP：通过', () => {
    expect(gradeQuestion('Q5.2', [c('微血管病性溶血（MAHA）', ['E23.Smear', 'E21.PLT']), c('疑似 TTP')]).result).toBe('pass');
  });
  it('只答胆管炎未控制：需补充', () => {
    expect(gradeQuestion('Q5.2', [c('胆管炎未控制', ['E22.Fever'])]).result).toBe('insufficient');
  });
});

describe('Q5.3 处置原则是什么', () => {
  it('取样＋血浆置换＋激素：通过', () => {
    const v = gradeQuestion('Q5.3', [c('治疗前取血送 ADAMTS13 活性', [], '治疗前'), c('血浆置换', [], '立即'), c('糖皮质激素', [], '立即')]);
    expect(v).toEqual({ result: 'pass', crash: false });
  });
  it('等 ADAMTS13 回报再定：翻车（第 9.4 节示例）', () => {
    const v = gradeQuestion('Q5.3', [c('治疗前取血送 ADAMTS13 活性'), c('等 ADAMTS13 回报再定')]);
    expect(v).toEqual({ result: 'insufficient', crash: true });
  });
  it('血浆置换标为结果回报后：翻车', () => {
    const v = gradeQuestion('Q5.3', [c('治疗前取血送 ADAMTS13 活性'), c('联系血液科'), c('血浆置换', [], '结果回报后')]);
    expect(v.crash).toBe(true);
  });
});

describe('MDT', () => {
  it('血液科：等结果即翻车（T30）', () => {
    expect(judgeMdt('hema', ['等 ADAMTS13 回报再定'])).toBe('crash');
  });
  it('血液科：涂片＋血小板＋高度怀疑可说服', () => {
    expect(judgeMdt('hema', ['E23.Smear', 'E21.PLT', '高度怀疑'])).toBe('persuade');
  });
  it('产科：先终止妊娠不翻车（T34）', () => {
    expect(judgeMdt('ob', ['先终止妊娠再治疗'])).toBe('none');
  });
  it('排序：取样晚于置换被指出，置换放回报后算翻车', () => {
    const base = {
      '治疗前取血送 ADAMTS13 活性': 'now', 联系血液科: 'now', 血浆置换: 'now', 糖皮质激素: 'now',
      继续抗感染: 'parallel', 产科评估与协调: 'parallel', 复核诊断: 'after',
    } as const;
    expect(judgeOrder({ ...base }).matches).toBe(7);
    expect(judgeOrder({ ...base, '治疗前取血送 ADAMTS13 活性': 'parallel' }).samplingLate).toBe(true);
    expect(judgeOrder({ ...base, 血浆置换: 'after' }).crash).toBe(true);
  });
});

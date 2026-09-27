import { describe, expect, it } from 'vitest';
import type { Claim, ItemId } from '../types';
import { CHAPTERS, ALL_QUESTIONS } from '../data/chapters';
import { ALL_ITEMS } from '../data/items';
import { feedbackFor } from './feedback';
import { gradeQuestion } from './grade';

const c = (card: string, evidence: ItemId[] = []): Claim => ({ key: card, card, evidence, timing: null });

/** 各题的参考答案，与《审阅用-全章答案》一致 */
export const MODEL: Record<string, Claim[]> = {
  'Q1.1': [
    c('黄疸进行性加深', ['E03.1']),
    c('发热伴寒战', ['E03.3']),
    c('右上腹痛', ['E03.2', 'E06.1']),
    c('皮肤黏膜出血', ['E05.2']),
    c('贫血貌', ['E05.1']),
  ],
  'Q1.2': [c('胆汁淤积（可能）', ['E02.3', 'E02.4']), c('溶血参与（待证实）', ['E02.5'])],
  'Q1.3': [c('胆道梗阻（待查）', ['E03.2']), c('肝胆系统感染（待查）', ['E03.3']), c('出血倾向／血液系统异常（待查）', ['E05.2'])],
  'Q2.1': [
    c('贫血', ['E08.1']),
    c('血小板严重减少', ['E08.2']),
    c('胆红素显著升高、以直接胆红素为主', ['E09.1']),
    c('胆总管下段狭窄', ['E12.2']),
  ],
  'Q2.2': [c('胆道梗阻', ['E12.2', 'E09.1']), c('胆道感染（胆管炎）', ['E03.3', 'E11.1'])],
  'Q2.3': [c('胆总管梗阻', ['E12.2']), c('急性胆管炎', ['E03.3']), c('TMA 待鉴别', ['E08.2'])],
  'Q3.1': [c('胆总管梗阻', ['E12.2']), c('急性胆管炎', ['E03.3', 'E11.1'])],
  'Q3.2': [c('TMA', ['E08.2', 'E09.4']), c('感染相关消耗／DIC', ['E08.2'])],
  'Q3.3': [c('血液异常的机制未证实', ['E08.2']), c('胆道诊断不能解释全部表现')],
  'Q4.1': [c('及时胆道引流（团队评估下）', ['E12.2']), c('抗感染', ['E03.3']), c('产科评估与协调', ['E16.1'])],
  'Q4.2': [
    c('引流可解除梗阻、控制感染', ['E12.2']),
    c('血小板低，操作出血风险高', ['E08.2']),
    c('胎死宫内需产科同步处理', ['E16.1']),
  ],
  'Q4.3': [
    c('先征求患者本人意见'),
    c('当前已知病情', ['E12.2']),
    c('胎儿情况如实告知', ['E16.1']),
    c('引流的必要性', ['E12.2']),
    c('操作风险（含出血）', ['E08.2']),
    c('替代方案与不确定性'),
  ],
  'Q6.1': [
    c('胆道梗阻／胆管炎', ['E19.2']),
    c('iTTP', ['E24.1', 'E24.2']),
    c('SLE（高度考虑）', ['E26.2', 'E27.1']),
    c('胎死宫内', ['E16.1']),
    c('APS（待评估）', ['E28.1']),
  ],
  'Q6.2': [
    c('SLE 背景与 iTTP：支持相关', ['E27.1', 'E24.2']),
    c('溶血→色素结石→梗阻：可能机制，未证实', ['E19.1']),
    c('LA 阳性＋妊娠丢失→APS：值得评估', ['E28.1', 'E25.2']),
  ],
  'Q6.3': [c('胆管狭窄／梗阻的病因'), c('抗磷脂抗体是否持续阳性')],
};

describe('章节数据自洽', () => {
  for (const ch of Object.values(CHAPTERS)) {
    for (const q of ch.questions) {
      it(`${q.id} 的卡与类别都存在`, () => {
        const shown = ch.cards.filter((g) => q.categories.includes(g.category)).flatMap((g) => g.cards);
        expect(shown.length).toBeGreaterThan(0);
        if (!q.spec) return;
        const named = [
          ...Object.keys(q.spec.support),
          ...q.spec.wrong.flatMap((w) => w.cards),
          ...q.spec.need.flatMap((n) => n.cards),
        ];
        for (const card of named) expect(shown, card).toContain(card);
        const groups = new Set(Object.values(ALL_ITEMS).map((i) => i.group));
        for (const s of Object.values(q.spec.support))
          for (const g of s.groups.flat()) expect(groups.has(g) || g in ALL_ITEMS, g).toBe(true);
      });
    }
  }
});

describe('各章参考答案', () => {
  for (const [q, claims] of Object.entries(MODEL)) {
    it(`${q} 参考答案通过`, () => {
      for (const cl of claims) for (const id of cl.evidence) expect(ALL_ITEMS[id], id).toBeTruthy();
      expect(gradeQuestion(q, claims)).toEqual({ result: 'pass', crash: false });
    });
  }
});

describe('声明式判定与上级意见', () => {
  it('每道声明式题目：只交一张无关卡时不通过，并有具体意见', () => {
    for (const q of Object.values(ALL_QUESTIONS)) {
      if (!q.spec) continue;
      const claims = [c('（无关）')];
      expect(gradeQuestion(q.id, claims).result).toBe('insufficient');
      expect(feedbackFor(q.id, claims, 1)?.kind).toBe('missing');
    }
  });
  it('与原始记录不符的卡：标出该论点', () => {
    const f = feedbackFor('Q1.1', [...MODEL['Q1.1'], c('Murphy 征阳性', ['E06.1'])], 1)!;
    expect(f).toMatchObject({ kind: 'wrong', keys: ['Murphy 征阳性'] });
  });
  it('论据挂错：标出该论点并说明应该用什么资料', () => {
    const f = feedbackFor('Q2.2', [c('胆道梗阻', ['E08.1']), c('胆道感染（胆管炎）', ['E03.3', 'E11.1'])], 2)!;
    expect(f.keys).toEqual(['胆道梗阻']);
    expect(f.text).toContain('MRCP');
  });
  it('两类论据只挂了一类：也算挂错', () => {
    expect(gradeQuestion('Q2.2', [c('胆道梗阻', ['E12.2']), c('胆道感染（胆管炎）', ['E03.3', 'E11.1'])]).result).toBe(
      'insufficient',
    );
  });
  it('没挂论据：先问依据', () => {
    const f = feedbackFor('Q3.1', [c('胆总管梗阻'), c('急性胆管炎', ['E03.3'])], 1)!;
    expect(f).toMatchObject({ kind: 'wrong', keys: ['胆总管梗阻'] });
  });
  it('第四章“暂不处理，观察”：翻车', () => {
    expect(gradeQuestion('Q4.1', [...MODEL['Q4.1'], c('暂不处理，观察')])).toEqual({ result: 'insufficient', crash: true });
  });
  it('第六章把可能机制说成已证实：不通过', () => {
    expect(gradeQuestion('Q6.2', [...MODEL['Q6.2'], c('溶血→色素结石→梗阻：已证实')]).result).toBe('insufficient');
  });
  it('多写合理的卡不影响通过（T04）', () => {
    expect(gradeQuestion('Q1.1', [...MODEL['Q1.1'], c('头痛', ['E07.1']), c('心率增快', ['E04.1'])]).result).toBe('pass');
  });
});

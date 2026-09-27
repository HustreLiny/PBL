import type { CardGroup } from './chapters/types';

// 第五章卡池（附录 E.3）。按题型分类显示，类别内不按答案增减。
export const CARD_POOL: CardGroup[] = [
  {
    category: '趋势', color: 'trend',
    cards: [
      '胆红素下降', '直接胆红素下降为主', '间接胆红素基本不变', '血红蛋白继续下降', '血小板仍严重减低',
      'LD 下降但仍异常', '肌酐继续升高', '出现蛋白尿', '仍发热', '仍头痛',
    ],
  },
  { category: '整体判断', color: 'overall', cards: ['局部改善', '整体仍危险', '整体已经好转', '病情稳定可观察'] },
  {
    category: '机制', color: 'mech',
    cards: [
      '胆道梗阻已缓解', '溶血持续', '微血管病性溶血（MAHA）', '血小板消耗', '骨髓生成不足', '失血',
      '肾脏受累', '神经系统受累', '感染未控制',
    ],
  },
  {
    category: '诊断', color: 'dx',
    cards: ['TMA', '疑似 TTP', 'HUS', '补体介导 TMA', 'DIC', 'HELLP 综合征', '胆管炎未控制', '药物相关', '自身免疫病'],
  },
  {
    category: '检查动作', color: 'test',
    cards: [
      '治疗前取血送 ADAMTS13 活性', 'ADAMTS13 抑制物／抗体', '复查涂片', '复查血常规和 LD', '血培养', '补体检测',
      '自身抗体筛查', '头颅影像',
    ],
  },
  {
    category: '救治动作', color: 'tx',
    cards: [
      '联系血液科', '血浆置换', '糖皮质激素', '继续抗感染', '产科评估与协调', '先终止妊娠再治疗', '再次 ERCP',
      '等 ADAMTS13 回报再定', '输注血小板', '复核诊断',
    ],
  },
];

/** MDT 中可用的补充词汇 */
export const MDT_EXTRA = ['立即', '治疗前', '同时进行', '结果回报后', '高度怀疑'];

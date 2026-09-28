import type { ChapterId, Item, ItemId } from '../types';

// 只收录设计稿已登记的原病例事实（F）。数值与措辞改动前须对照设计稿附录 A。
// 不替玩家做任何计算（如间接胆红素）。

const mk = (group: string, time: string, source: string, rows: [string, string][]): Item[] =>
  rows.map(([name, value], i) => ({ id: `${group}.${i + 1}`, group, name, value, time, source }));

const item = (id: ItemId, name: string, value: string, time: string, source: string): Item => ({
  id, group: id.split('.')[0], name, value, time, source,
});

// ---------- 对话、查体中的信息条目 ----------

export const DIALOG_ITEMS = {
  // 序章：交班
  age: item('E01.1', '年龄与孕周', '22 岁，孕 19 周', '外院', 'S1'),
  onset: item('E01.2', '起病', '低热、黄染 3 天', '外院', 'S1'),
  recent: item('E01.3', '近 1 天', '牙龈少量出血、腹胀、乏力、头痛', '外院', 'S1'),
  // 第一章：床旁
  jaundice: item('E03.1', '黄染', '较前加深', '急诊', 'S2'),
  pain: item('E03.2', '腹痛', '右上腹痛，NRS 5', '急诊', 'S2'),
  chill: item('E03.3', '发热', 'Tmax 39℃，伴寒战', '急诊', 'S2'),
  vitals: item('E04.1', '生命体征', 'BP 150/90 mmHg，HR 120 次/分，RR 20 次/分，T 39℃', '急诊', 'S2'),
  general: item('E05.1', '一般情况', '贫血貌，重度黄染', '急诊', 'S2'),
  bleed: item('E05.2', '出血表现', '前胸及前臂散在瘀点，牙龈渗血', '急诊', 'S2'),
  abdomen: item('E06.1', '腹部查体', '腹软，右上腹轻压痛，无反跳痛及肌紧张，Murphy 征阴性', '急诊', 'S2'),
  neuro: item('E07.1', '神经情况', '已有头痛；意识改变、抽搐等情况暂未记录，需继续评估', '急诊', 'S1＋U'),
  // 第五章：ICU
  fever: item('E22.Fever', '体温', '仍发热（护士交班）', '引流后', 'S3'),
  headache: item('E22.Headache', '头痛', '仍头痛（护士交班）', '引流后', 'S3'),
  // 既往史（白名单，可提前问得）
  g3: item('E25.1', '孕产史', '本次为第三次妊娠', '既往', 'S4（提前问得，N）'),
  loss: item('E25.2', '孕产史', '前两次分别在孕 7、8 周自然流产', '既往', 'S4（提前问得，N）'),
  oldCbc: item('E26.1', '旧体检', '两年前血小板低、轻度贫血', '既往', 'S5（提前问得，N）'),
  sun: item('E26.2', '系统症状', '日晒后红斑发痒', '既往', 'S5（提前问得，N）'),
  ulcer: item('E26.3', '系统症状', '反复口腔溃疡', '既往', 'S5（提前问得，N）'),
  hair: item('E26.4', '系统症状', '脱发', '既往', 'S5（提前问得，N）'),
} satisfies Record<string, Item>;

// ---------- HIS 报告 ----------

export interface Report {
  id: string;
  title: string;
  time: string;
  /** 从哪一章起出现在 HIS 中（设计稿 3.6 最早开放节点） */
  chapter: ChapterId;
  items: Item[];
}

export const REPORTS: Report[] = [
  {
    id: 'R-E02', title: '外院化验', time: '外院', chapter: 'p0',
    items: mk('E02', '外院', 'S1', [
      ['ALT / AST', '82 / 147 U/L'],
      ['TBil / DBil', '72 / 32 μmol/L'],
      ['GGT', '198 U/L'],
      ['ALP', '220 U/L'],
      ['LDH', '781.5 U/L'],
      ['Cr', '99 μmol/L'],
    ]),
  },
  {
    id: 'R-E08', title: '急诊血常规', time: '急诊', chapter: 'c2',
    items: mk('E08', '急诊', 'S2', [
      ['HGB', '70 g/L'],
      ['PLT', '18 ×10⁹/L'],
      ['WBC / NEUT', '14.67 ×10⁹/L / 80%'],
      ['MCV / MCHC', '98.4 fL / 343 g/L'],
    ]),
  },
  {
    id: 'R-E09', title: '急诊生化', time: '急诊', chapter: 'c2',
    items: mk('E09', '急诊', 'S2', [
      ['TBil / DBil', '400.9 / 320.2 μmol/L'],
      ['ALT / AST', '177 / 155 U/L'],
      ['GGT / ALP', '230 / 250 U/L'],
      ['LD', '915 U/L'],
      ['Cr', '111 μmol/L'],
      ['ALB', '38 g/L'],
    ]),
  },
  {
    id: 'R-E10', title: '急诊凝血', time: '急诊', chapter: 'c2',
    items: mk('E10', '急诊', 'S2', [
      ['PT / APTT', '13 s / 32 s'],
      ['Fbg', '4.27 g/L'],
      ['D-dimer', '4.14 mg/L FEU'],
    ]),
  },
  {
    id: 'R-E11', title: '炎性指标与胰酶', time: '急诊', chapter: 'c2',
    items: mk('E11', '急诊', 'S2', [
      ['hsCRP', '20.6 mg/L'],
      ['AMY / LIP', '188 / 288 U/L'],
    ]),
  },
  {
    id: 'R-E12', title: 'MRCP 报告', time: '急诊', chapter: 'c2',
    items: mk('E12', '急诊', 'S2', [
      ['MRCP', '肝内外胆管扩张'],
      ['MRCP', '胆总管下段局限性狭窄，近端胆管扩张'],
      ['MRCP', '胆管内见异常低信号影'],
    ]),
  },
  {
    id: 'R-E16', title: '产科超声', time: 'ERCP 前', chapter: 'c4',
    items: mk('E16', 'ERCP 前', 'S3', [['产科超声', '无胎心，提示胎死宫内']]),
  },
  {
    id: 'R-chem', title: '引流后生化', time: '引流后', chapter: 'c5',
    items: [
      item('E20.TBil', 'TBil', '180.2 μmol/L', '引流后', 'S3'),
      item('E20.DBil', 'DBil', '100.5 μmol/L', '引流后', 'S3'),
      item('E21.LD', 'LD', '500 U/L', '引流后', 'S3'),
      item('E22.Cr', 'Cr', '120 μmol/L', '引流后', 'S3'),
    ],
  },
  {
    id: 'R-cbc', title: '引流后血常规', time: '引流后', chapter: 'c5',
    items: [
      item('E21.HGB', 'HGB', '60 g/L', '引流后', 'S3'),
      item('E21.PLT', 'PLT', '约 20 ×10⁹/L', '引流后', 'S3'),
    ],
  },
  {
    id: 'R-urine', title: '引流后尿检', time: '引流后', chapter: 'c5',
    items: [
      item('E22.Pro', '尿蛋白', '1 g/L（浓度，非 24 h 定量）', '引流后', 'S3'),
      item('U22.Uro', '尿胆原', '16 μmol/L', '引流后', 'S3'),
      item('U22.Bil', '尿胆红素', '大量', '引流后', 'S3'),
    ],
  },
  {
    id: 'R-hemo', title: '网织红与外周血涂片', time: '引流后', chapter: 'c5',
    items: [
      item('E23.Ret', '网织红', '10%', '引流后', 'S3'),
      item('E23.Smear', '外周血涂片', '大量破碎红细胞', '引流后', 'S3'),
    ],
  },
  {
    id: 'R-E27', title: '自身免疫检查', time: '后续', chapter: 'c6',
    items: mk('E27', '后续', 'S5', [
      ['ANA', '1:1280'],
      ['抗 dsDNA', 'IF 1:40；ELISA 1360 IU/ml'],
      ['抗 RNP／Sm／rRNP', '均 +++'],
      ['C3 / C4', '报告记为显著减低，未提供具体值'],
      ['IgG', '26 g/L'],
      ['自免肝抗体谱', '阴性'],
    ]),
  },
  {
    id: 'R-E28', title: '抗磷脂相关检查', time: '后续', chapter: 'c6',
    items: mk('E28', '后续', 'S5＋U', [
      ['LA', '2.2（参考范围 <1.2）'],
      ['其他“磷脂抗体”', '报告记为阴性，具体项目未注明，需核实'],
    ]),
  },
  {
    id: 'R-E29', title: '24 h 尿蛋白', time: '后续', chapter: 'c6',
    items: mk('E29', '后续', 'S5', [['24 h 尿蛋白', '1.8 g']]),
  },
  {
    id: 'R-E30', title: '治疗经过记录', time: '后续', chapter: 'c6',
    items: mk('E30', '后续', 'S5', [
      ['治疗', '引产清宫、血浆置换、糖皮质激素、利妥昔单抗'],
      ['转归', 'iTTP 缓解'],
    ]),
  },
];

export const reportById = (id: string) => REPORTS.find((r) => r.id === id);

// ---------- 章末回报 ----------

export const E19_ITEMS: Item[] = mk('E19', 'ERCP', 'S3', [
  ['ERCP 所见', '见黑胆汁'],
  ['ERCP 所见', '胆管下段狭窄，可疑小充盈缺损'],
  ['ERCP 处置', '留置胆管与胰管支架，引流通畅'],
]);

export const E24_ITEMS: Item[] = [
  item('E24.1', 'ADAMTS13 活性', '<5%', '后续回报', 'S4'),
  item('E24.2', 'ADAMTS13 抑制物抗体', '阳性', '后续回报', 'S4'),
  item('E24.3', '补体系统', '报告记“未见活化”，未提供具体项目与数值', '后续回报', 'S4'),
];

export const E31_ITEMS: Item[] = mk('E31', '后续', 'S5', [['风湿免疫会诊', '考虑 SLE']]);

export const E32_ITEMS: Item[] = mk('E32', '随访', 'S5', [
  ['支架', '3 个月后拔除胆总管支架'],
  ['后记', '2025 年再次自然妊娠顺利产子，母子体健'],
]);

export const ALL_ITEMS: Record<ItemId, Item> = Object.fromEntries(
  [
    ...Object.values(DIALOG_ITEMS),
    ...REPORTS.flatMap((r) => r.items),
    ...E19_ITEMS, ...E24_ITEMS, ...E31_ITEMS, ...E32_ITEMS,
  ].map((i) => [i.id, i]),
);

export const itemsOf = (...groups: string[]) =>
  Object.values(ALL_ITEMS).filter((i) => groups.includes(i.group)).map((i) => i.id);

export const itemLabel = (id: ItemId) => {
  const i = ALL_ITEMS[id];
  return i ? `${i.name}：${i.value}` : id;
};

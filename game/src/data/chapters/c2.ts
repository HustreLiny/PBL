import { itemsOf } from '../items';
import { historyTopics, opened, workstation } from './common';
import type { ChapterDef } from './types';

// 第二章：歧路（设计稿第 6 节）。读取急诊检验与 MRCP，确认问题。

const REQUIRED = ['R-E08', 'R-E09', 'R-E10', 'R-E11', 'R-E12'];

export const C2: ChapterDef = {
  id: 'c2',
  no: '第二章',
  title: '歧路',
  scenes: {
    station: workstation('去急诊床旁', 'bed'),
    bed: {
      name: '急诊床旁', art: 'scene-er-bed', width: 720, spawn: 80,
      hotspots: [
        { id: 'door', kind: 'door', label: '回工作站', x: 28, to: 'station' },
        { id: 'patient', kind: 'person', label: '患者', x: 180, art: 'sprite-patient', who: '患者' },
      ],
    },
  },
  startScene: 'station',
  topics: historyTopics('patient'),
  opening: (s) => [
    { who: '师姐', text: '急诊的化验和 MRCP 都回来了，在 HIS 上。你先看看。' },
    ...(s.suggestions.includes('us') && !s.suggestions.includes('mrcp')
      ? [
          {
            who: '师姐' as const,
            text: '你之前想用超声看胆道，这个目的是对的。本病例没有超声的结果；MRCP 的报告能回答同一个问题。',
          },
        ]
      : []),
  ],
  exitLabel: '“看完了，去找主任汇报吧。”',
  blockers: (s) =>
    REQUIRED.every((r) => opened(s, r)) ? null : [{ who: '师姐', text: '急诊的化验和 MRCP 还没看完吧？都在 HIS 上。' }],
  goLines: [{ who: '师姐', text: '走，去跟主任汇报。' }],
  questions: [
    {
      id: 'Q2.1', title: '有哪些异常？', categories: ['血常规', '生化', '凝血与炎症', '影像'],
      insufficient: '异常的归纳还不完整。',
      hints: [
        '几张报告和 MRCP 都过一遍，挑出异常的。',
        '血常规、生化、影像各有要点。',
        'HGB 70、PLT 18；胆红素明显升高、以直接胆红素为主，酶谱升高；MRCP 见胆总管下段狭窄、胆管扩张。',
      ],
      spec: {
        support: {
          贫血: { groups: [['E08']], where: '急诊血常规' },
          血小板严重减少: { groups: [['E08']], where: '急诊血常规' },
          白细胞及中性粒细胞升高: { groups: [['E08']], where: '急诊血常规' },
          '胆红素显著升高、以直接胆红素为主': { groups: [['E09']], where: '急诊生化' },
          转氨酶升高: { groups: [['E09', 'E02']], where: '急诊生化' },
          'GGT／ALP 升高': { groups: [['E09', 'E02']], where: '急诊生化' },
          'LD 升高': { groups: [['E09', 'E02']], where: '急诊生化' },
          '肌酐偏高（孕期）': { groups: [['E09', 'E02']], where: '急诊生化' },
          'D-dimer 升高': { groups: [['E10']], where: '急诊凝血' },
          'hsCRP 升高': { groups: [['E11']], where: '炎性指标' },
          胰酶升高: { groups: [['E11']], where: '胰酶结果' },
          胆管扩张: { groups: [['E12']], where: 'MRCP 报告' },
          胆总管下段狭窄: { groups: [['E12']], where: 'MRCP 报告' },
          胆管内异常信号: { groups: [['E12']], where: 'MRCP 报告' },
        },
        wrong: [
          { cards: ['凝血时间明显延长'], text: ['凝血报告再看一遍。', 'PT 13 s、APTT 32 s，能说明显延长吗？'] },
          { cards: ['纤维蛋白原降低'], text: ['标出来的这条，和报告对得上吗？', 'Fbg 是 4.27 g/L。'] },
          { cards: ['明确胰腺炎'], text: ['胰酶升高，就能诊断胰腺炎吗？', '这一题只列异常，写“胰酶升高”就够了。'] },
          { cards: ['超声未见异常', '肝炎病毒阴性'], text: ['这项检查做过吗？', '本病例没有这项结果。没做的检查，不能写成正常或阴性。'] },
        ],
        need: [
          { cards: ['血小板严重减少'], text: ['血常规里最危险的是哪一项？', 'PLT 是多少？'] },
          { cards: ['贫血'], text: ['血红蛋白呢？', 'HGB 70 g/L 说明什么？'] },
          {
            cards: ['胆红素显著升高、以直接胆红素为主', '转氨酶升高', 'GGT／ALP 升高', 'LD 升高'],
            text: ['生化里有哪些异常？', '和外院比，胆红素和胆系酶谱怎样了？'],
          },
          { cards: ['胆管扩张', '胆总管下段狭窄', '胆管内异常信号'], text: ['影像报告里有什么发现？', 'MRCP 看到了什么？'] },
        ],
      },
    },
    {
      id: 'Q2.2', title: '如何解释这些异常？', categories: ['机制'],
      insufficient: '对异常的解释还不充分。',
      hints: [
        '哪些异常能归到同一个原因上？',
        '影像加胆红素说明一件事；症状加炎性指标说明另一件事。',
        'MRCP 的狭窄、扩张和胆红素升高支持胆道梗阻；发热寒战和白细胞、hsCRP 升高支持感染。',
      ],
      spec: {
        support: {
          胆道梗阻: { groups: [['E12'], ['E09', 'E03', 'E02']], where: 'MRCP，再加上胆红素或症状' },
          '胆道感染（胆管炎）': { groups: [['E03', 'E04'], ['E08', 'E11']], where: '发热寒战等表现，再加上血象或炎性指标' },
          胆汁淤积: { groups: [['E09', 'E02']], where: '生化结果' },
          肝细胞损伤: { groups: [['E09', 'E02']], where: '生化结果' },
          胰腺受累可能: { groups: [['E11']], where: '胰酶结果' },
          血小板减少原因未明: { groups: [['E08']], where: '急诊血常规' },
          贫血原因未明: { groups: [['E08']], where: '急诊血常规' },
          '溶血可能（待证实）': { groups: [['E08', 'E09']], where: '血常规或 LD' },
        },
        wrong: [
          {
            cards: ['DIC 已确诊'],
            text: ['这个结论下得太早。', 'PT、APTT 不长，纤维蛋白原也不低，现在不能确诊 DIC。'],
          },
          { cards: ['溶血已证实'], text: ['现在有溶血的直接证据吗？', '贫血加 LD 升高只是线索，还需要更直接的检查。'] },
          { cards: ['胰腺炎已确诊'], text: ['胰酶升高就够确诊了吗？', '可以写“胰腺受累可能”。'] },
        ],
        need: [
          { cards: ['胆道梗阻'], text: ['影像和化验，能不能连起来说明一件事？', '把 MRCP 和胆红素或症状放在一起。'] },
          { cards: ['胆道感染（胆管炎）'], text: ['发热、寒战，你怎么解释？', '把症状体征和血象、炎性指标连起来。'] },
        ],
      },
    },
    {
      id: 'Q2.3', title: '目前考虑哪些诊断？', categories: ['诊断'],
      insufficient: '目前诊断的依据还不充分。',
      hints: [
        '胆道的诊断能解释所有异常吗？',
        '严重血小板减少和贫血，胆道诊断能完全解释吗？',
        '考虑胆总管梗阻合并急性胆管炎；同时要保留血液系统问题待查，TMA、DIC 等可以作为待鉴别方向。',
      ],
      spec: {
        support: {
          急性胆管炎: { groups: [['E03', 'E04', 'E08', 'E11']], where: '感染相关的表现或指标' },
          胆总管梗阻: { groups: [['E12']], where: 'MRCP 报告' },
          血液系统问题待查: { groups: [['E08']], where: '急诊血常规' },
          'TMA 待鉴别': { groups: [['E08']], where: '急诊血常规' },
          'DIC 待鉴别': { groups: [['E08', 'E10']], where: '血常规或凝血' },
          妊娠相关疾病待鉴别: { groups: [['E01', 'E04', 'E08', 'E09']], where: '孕周、血压或化验' },
        },
        wrong: [
          {
            cards: ['血液异常都由胆管炎引起（确定）'],
            text: ['一个诊断就把血液问题都解释了？', '胆管炎能完全解释 PLT 18、HGB 70 吗？先单独保留。'],
          },
          {
            cards: ['TTP（确诊）', '妊娠期急性脂肪肝（确诊）'],
            text: ['现在能确诊吗？', '可以作为待鉴别的方向，确诊还缺证据。'],
          },
        ],
        need: [
          { cards: ['急性胆管炎', '胆总管梗阻'], text: ['胆道方面的诊断呢？', '影像加上发热、腹痛、黄疸，考虑什么？'] },
          {
            cards: ['血液系统问题待查', 'TMA 待鉴别', 'DIC 待鉴别'],
            text: ['血常规的问题，诊断里放了吗？', '胆道诊断解释不了严重血小板减少，要单独保留。'],
          },
        ],
      },
    },
  ],
  cards: [
    { category: '血常规', color: 'trend', cards: ['贫血', '血小板严重减少', '白细胞及中性粒细胞升高'] },
    {
      category: '生化', color: 'overall',
      cards: ['胆红素显著升高、以直接胆红素为主', '转氨酶升高', 'GGT／ALP 升高', 'LD 升高', '肌酐偏高（孕期）', '肝炎病毒阴性'],
    },
    {
      category: '凝血与炎症', color: 'test',
      cards: ['D-dimer 升高', 'hsCRP 升高', '胰酶升高', '凝血时间明显延长', '纤维蛋白原降低', '明确胰腺炎'],
    },
    { category: '影像', color: 'mech', cards: ['胆管扩张', '胆总管下段狭窄', '胆管内异常信号', '超声未见异常'] },
    {
      category: '机制', color: 'mech',
      cards: [
        '胆道梗阻', '胆道感染（胆管炎）', '胆汁淤积', '肝细胞损伤', '胰腺受累可能', '血小板减少原因未明', '贫血原因未明',
        '溶血可能（待证实）', 'DIC 已确诊', '溶血已证实', '胰腺炎已确诊',
      ],
    },
    {
      category: '诊断', color: 'dx',
      cards: [
        '急性胆管炎', '胆总管梗阻', '血液系统问题待查', 'TMA 待鉴别', 'DIC 待鉴别', '妊娠相关疾病待鉴别',
        '血液异常都由胆管炎引起（确定）', 'TTP（确诊）', '妊娠期急性脂肪肝（确诊）',
      ],
    },
  ],
  seniorHints: [],
  afterReport: {
    lines: [
      { who: '刘主任', text: '胆道一组，血液一组。两组问题都在。' },
      { who: '刘主任', text: '下一步，把候选的解释放在一起比一比。' },
    ],
    next: 'chapterEnd',
  },
  onPass: (q, claims, s) =>
    q === 'Q2.3' && !s.flags.suspectTma && claims.some((c) => c.card === 'TMA 待鉴别' && c.evidence.length > 0)
      ? { flag: 'suspectTma', entry: { kind: '提前识别', clinical: 2, patient: 0, note: '第二章有依据地提出 TMA 待鉴别' } }
      : null,
  core: itemsOf('E08', 'E09', 'E10', 'E11', 'E12'),
  ideal: { clinical: 3, patient: 0 },
  endLine: '胆道与血液，两组问题摆在面前。一个解释能涵盖全部吗？',
};

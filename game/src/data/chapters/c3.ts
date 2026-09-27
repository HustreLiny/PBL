import { historyTopics } from './common';
import type { ChapterDef } from './types';

// 第三章：山重水复（设计稿第 7 节）。在白板上比较候选解释，整理工作诊断、鉴别与不确定之处。

export const BOARD_HYPS = ['胆道梗阻／胆管炎', '妊娠相关疾病', 'TMA', 'DIC', '病毒性肝炎'];
/** 白板右侧“待解释的证据”：只显示玩家已收集的 */
export const BOARD_FINDINGS = ['E08.2', 'E08.1', 'E09.4', 'E12.2', 'E03.3', 'E10.1', 'E05.2'];
export type Mark = '能解释' | '解释不了' | '说不准';
export const MARKS: Mark[] = ['能解释', '解释不了', '说不准'];

export const C3: ChapterDef = {
  id: 'c3',
  no: '第三章',
  title: '山重水复',
  scenes: {
    room: {
      name: '示教室', art: 'scene-seminar', width: 720, spawn: 200,
      hotspots: [
        { id: 'his', kind: 'his', label: 'HIS 电脑', x: 80 },
        { id: 'board', kind: 'board', label: '会诊白板', x: 310, lift: 50 },
        { id: 'senior', kind: 'senior', label: '师姐', x: 500, art: 'sprite-senior', who: '师姐' },
        { id: 'door', kind: 'door', label: '去病房', x: 692, to: 'bed' },
      ],
    },
    bed: {
      name: '病房', art: 'scene-ward', width: 640, spawn: 80,
      hotspots: [
        { id: 'door', kind: 'door', label: '回示教室', x: 28, to: 'room' },
        { id: 'patient', kind: 'person', label: '患者', x: 240, art: 'sprite-patient', who: '患者' },
      ],
    },
  },
  startScene: 'room',
  topics: historyTopics('patient'),
  opening: () => [
    { who: '师姐', text: '白板给你擦干净了。把几个候选解释列上去，看看哪些证据能解释、哪些解释不了。' },
    { who: '师姐', text: '白板上的东西只是草稿，不打分。想清楚了再去跟主任汇报。' },
  ],
  exitLabel: '“想得差不多了，去找主任汇报吧。”',
  blockers: (s) => {
    const marks = Object.keys(s.board.marks).length;
    if (s.board.hyps.length < 2 || marks === 0)
      return [{ who: '师姐', text: '先在白板上至少列两个候选方向，拿证据比一比。' }];
    return null;
  },
  goLines: [{ who: '师姐', text: '好，去跟主任汇报。' }],
  questions: [
    {
      id: 'Q3.1', title: '工作诊断是什么？', categories: ['工作诊断'],
      insufficient: '工作诊断的依据还不充分。',
      hints: [
        '工作诊断是现在最有把握、需要先处理的问题。',
        '影像和感染的证据，各自指向什么？',
        'MRCP 支持胆总管梗阻；发热寒战、心率快、炎性指标升高支持急性胆管炎。血液问题可以作为并存问题列出。',
      ],
      spec: {
        support: {
          急性胆管炎: { groups: [['E03', 'E04', 'E11']], where: '发热寒战、生命体征或炎性指标' },
          胆总管梗阻: { groups: [['E12']], where: 'MRCP 报告' },
          血液系统异常待查: { groups: [['E08']], where: '急诊血常规' },
        },
        wrong: [
          {
            cards: ['TTP（确诊）', '妊娠期急性脂肪肝（确诊）', 'DIC（确诊）'],
            text: ['现在能确诊吗？', '工作诊断要有把握；没把握的放到鉴别里。'],
          },
        ],
        need: [
          { cards: ['胆总管梗阻'], text: ['工作诊断里，胆道的问题说清楚了吗？', 'MRCP 的发现支持什么诊断？'] },
          { cards: ['急性胆管炎'], text: ['感染方面呢？', '发热寒战、心率快、炎性指标升高，放在一起是什么？'] },
        ],
      },
    },
    {
      id: 'Q3.2', title: '鉴别诊断有哪些？', categories: ['鉴别方向'],
      insufficient: '鉴别诊断的依据还不充分。',
      hints: [
        '工作诊断解释不了的证据，还剩哪些？',
        '严重血小板减少、贫血和 LD 升高，可能来自哪几类疾病？',
        'TMA、感染相关消耗或 DIC、妊娠相关疾病都可以比较，挂上 PLT、HGB、LD 等依据；不要求逐个排除。',
      ],
      spec: {
        support: {
          TMA: { groups: [['E08', 'E09']], where: '血常规或 LD' },
          '感染相关消耗／DIC': { groups: [['E08', 'E10', 'E11']], where: '血常规、凝血或炎性指标' },
          '妊娠相关疾病（如 HELLP）': { groups: [['E01', 'E04', 'E08', 'E09']], where: '孕周、血压或化验' },
          病毒性肝炎: { groups: [['E02', 'E09']], where: '肝功能结果' },
        },
        wrong: [
          {
            cards: ['已排除 DIC'],
            text: ['凭一次凝血结果，能绝对排除吗？', 'PT、APTT 正常可以说“不太支持”，但不能单凭这一次绝对排除。'],
          },
          { cards: ['孕 19 周可排除 HELLP'], text: ['孕周能单独排除吗？', '孕周只是参考，要结合血压、血小板、溶血等。'] },
          { cards: ['已排除 TMA'], text: ['排除的依据是什么？', '现在还没有涂片等直接证据，不能排除。'] },
        ],
        need: [
          {
            cards: ['TMA', '感染相关消耗／DIC', '妊娠相关疾病（如 HELLP）'],
            text: ['严重血小板减少和贫血，还有哪些可能？', '把 PLT、HGB、LD 放在一起，想想哪几类疾病会这样。'],
          },
        ],
      },
    },
    {
      id: 'Q3.3', title: '哪些判断尚不确定？', categories: ['不确定之处'],
      insufficient: '不确定之处还没说清楚。',
      hints: [
        '回头看白板上“解释不了”和“说不准”的格子。',
        '血液异常的机制和病因，现在有直接证据吗？',
        '血液异常的具体机制和病因尚未证实；胆道诊断不能自动解释所有表现。',
      ],
      spec: {
        support: {},
        wrong: [
          {
            cards: ['所有异常已能用胆管炎解释'],
            text: ['真的全部都解释了吗？', 'PLT 18、HGB 70，用胆管炎能解释清楚吗？'],
          },
          { cards: ['血液问题已明确是 DIC'], text: ['已经明确了吗？', '现在的凝血结果不支持这么确定。'] },
        ],
        need: [
          {
            cards: ['血液异常的机制未证实', '血液异常的病因未明'],
            text: ['血液方面，哪些还没搞清楚？', '血小板和贫血的机制，现在有直接证据吗？'],
          },
          {
            cards: ['胆道诊断不能解释全部表现'],
            text: ['主要诊断能解释所有表现吗？', '胆道诊断和血液异常之间的关系，现在能确定吗？'],
          },
        ],
      },
    },
  ],
  cards: [
    {
      category: '工作诊断', color: 'dx',
      cards: ['急性胆管炎', '胆总管梗阻', '血液系统异常待查', 'TTP（确诊）', '妊娠期急性脂肪肝（确诊）', 'DIC（确诊）'],
    },
    {
      category: '鉴别方向', color: 'overall',
      cards: [
        'TMA', '感染相关消耗／DIC', '妊娠相关疾病（如 HELLP）', '病毒性肝炎', '已排除 DIC', '孕 19 周可排除 HELLP', '已排除 TMA',
      ],
    },
    {
      category: '不确定之处', color: 'test',
      cards: [
        '血液异常的机制未证实', '血液异常的病因未明', '胆道诊断不能解释全部表现', '梗阻的原因未明', '胎儿情况待评估',
        '神经症状原因未明', '所有异常已能用胆管炎解释', '血液问题已明确是 DIC',
      ],
    },
  ],
  seniorHints: [],
  afterReport: {
    lines: [
      { who: '刘主任', text: '好。胆道要处理，血液的问题要盯着。' },
      { who: '刘主任', text: '处置方案要多学科一起定。产科的结果也快出来了。' },
    ],
    next: 'chapterEnd',
  },
  core: [],
  ideal: { clinical: 3, patient: 0 },
  endLine: '工作诊断定了，疑问也留着。接下来，要在风险中推进处置。',
};

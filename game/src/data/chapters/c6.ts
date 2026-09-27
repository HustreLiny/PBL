import { E31_ITEMS, E32_ITEMS } from '../items';
import { historyTopics, opened, workstation } from './common';
import type { ChapterDef } from './types';

// 第六章：始作俑者？（设计稿第 10 节）。整合病史与多系统证据，区分已知诊断、可能关联和未解问题。

const REQUIRED = ['R-E27', 'R-E28', 'R-E29', 'R-E30'];
const hasGroup = (ids: string[], g: string) => ids.some((id) => id.startsWith(`${g}.`));

export const C6: ChapterDef = {
  id: 'c6',
  no: '第六章',
  title: '始作俑者？',
  scenes: {
    station: workstation('去病房', 'ward'),
    ward: {
      name: '病房', art: 'scene-ward', width: 640, spawn: 80,
      hotspots: [
        { id: 'door', kind: 'door', label: '回工作站', x: 28, to: 'station' },
        { id: 'patient', kind: 'person', label: '患者', x: 240, art: 'sprite-patient', who: '患者' },
        { id: 'family', kind: 'person', label: '家属', x: 380, art: 'sprite-family', who: '家属' },
      ],
    },
  },
  startScene: 'station',
  topics: [
    {
      id: 'pt-now', person: 'patient', label: '问她现在感觉怎么样',
      lines: [
        { who: '你', text: '这两天感觉怎么样？' },
        { who: '患者', text: '好一些了。头不怎么疼了。' },
      ],
    },
    ...historyTopics('patient'),
    {
      id: 'fam-talk', person: 'family', label: '和家属聊聊',
      lines: [
        { who: '家属', text: '医生，她这个病，以后还能好好过日子吗？' },
        { who: '你', text: '后面还要继续随访、评估。有什么情况，我们会和你们一起商量。' },
      ],
    },
  ],
  opening: () => [
    { who: '师姐', text: '她这两天稳定些了。风湿免疫的检查和治疗经过都在 HIS 上。' },
    { who: '师姐', text: '主任想听你说说：为什么这位年轻患者会出现这样的病程。哪些能确定，哪些还只是可能。' },
  ],
  exitLabel: '“整理好了，去找主任汇报吧。”',
  blockers: (s) => {
    if (!REQUIRED.every((r) => opened(s, r))) return [{ who: '师姐', text: '新的检查和治疗记录还没看完吧？都在 HIS 上。' }];
    if (!hasGroup(s.collected, 'E25') || !hasGroup(s.collected, 'E26'))
      return [{ who: '师姐', text: '她以前怀孕的情况、平时身体的情况，问过了吗？去病房核实一下。' }];
    return null;
  },
  goLines: [{ who: '师姐', text: '好，去吧。' }],
  questions: [
    {
      id: 'Q6.1', title: '最终诊断有哪些？', categories: ['诊断'],
      insufficient: '最终诊断还不完整。',
      hints: [
        '把六章的问题逐一过一遍：胆道、血液、免疫、妊娠。',
        'ADAMTS13 的结果，和病史里的系统症状加免疫学检查，各支持什么？',
        '胆道梗阻／胆管炎；ADAMTS13 严重缺乏加抑制物阳性支持 iTTP；病史加免疫学支持 SLE；以及胎死宫内。APS、肾受累可以写“待评估”。',
      ],
      spec: {
        support: {
          '胆道梗阻／胆管炎': { groups: [['E12', 'E19']], where: 'MRCP 或 ERCP 的记录' },
          iTTP: { groups: [['E24']], where: 'ADAMTS13 的结果' },
          'SLE（高度考虑）': { groups: [['E26'], ['E27']], where: '病史里的系统症状，再加上免疫学检查' },
          胎死宫内: { groups: [['E16']], where: '产科超声' },
          'APS（待评估）': { groups: [['E28', 'E25']], where: '抗磷脂结果或孕产史' },
          '肾受累（待评估）': { groups: [['E29', 'E22']], where: '尿蛋白或肌酐' },
        },
        wrong: [
          { cards: ['APS（确诊）'], text: ['能确诊吗？', 'LA 只有一次阳性，具体项目和持续性都还要核实。'] },
          { cards: ['狼疮肾炎（确诊）'], text: ['有肾活检吗？', '蛋白尿提示肾受累，病因还要评估。'] },
          { cards: ['遗传性 TTP'], text: ['抑制物抗体的结果说明什么？', '抑制物抗体阳性，更支持获得性、免疫性的 TTP。'] },
        ],
        need: [
          { cards: ['胆道梗阻／胆管炎'], text: ['胆道的诊断别漏了。', '前面的 MRCP 和 ERCP 支持什么？'] },
          { cards: ['iTTP'], text: ['血液的问题，最终诊断是什么？', 'ADAMTS13 的结果回来了。'] },
          {
            cards: ['SLE（高度考虑）'],
            text: ['她平时身体的那些情况，加上免疫学检查，指向什么？', '把日晒红斑、口腔溃疡、脱发和 ANA、抗 dsDNA 放在一起。'],
          },
          { cards: ['胎死宫内'], text: ['这次妊娠的结局，也要写进诊断。', '产科超声的结果。'] },
        ],
      },
    },
    {
      id: 'Q6.2', title: '各诊断有何关联？', categories: ['关联'],
      insufficient: '诊断之间的关联还没说清楚。',
      hints: [
        '每张关联卡都带着确定程度，选你有把握的那一种说法。',
        '免疫背景和其他问题之间，有哪些联系有依据？哪些还只是可能？',
        'SLE 背景与 iTTP 支持相关；溶血→色素结石→梗阻只是可能机制；LA 阳性加妊娠丢失值得评估 APS。',
      ],
      spec: {
        support: {
          'SLE 背景与 iTTP：支持相关': { groups: [['E26', 'E27'], ['E24']], where: '免疫学或病史资料，再加上 ADAMTS13 的结果' },
          '溶血→色素结石→梗阻：可能机制，未证实': { groups: [['E19', 'E23', 'E12']], where: 'ERCP、MRCP 或溶血的资料' },
          'LA 阳性＋妊娠丢失→APS：值得评估': { groups: [['E28'], ['E25']], where: 'LA 结果，再加上孕产史' },
          'SLE＋蛋白尿→肾受累：疑似，待评估': { groups: [['E29', 'E22']], where: '尿蛋白或肌酐' },
          'iTTP 与肾、神经受累：支持相关': { groups: [['E22', 'E07']], where: '肌酐、尿蛋白或头痛的记录' },
        },
        wrong: [
          {
            cards: ['SLE 背景导致 iTTP：已证实'],
            text: ['病例能证明这条因果链吗？', '说“支持相关”更稳妥，具体发病链还要谨慎。'],
          },
          {
            cards: ['溶血→色素结石→梗阻：已证实'],
            text: ['黑胆汁能当作结石成分的证据吗？', '没有取石和成分分析，只能算可能机制。'],
          },
          {
            cards: ['胆管炎可以解释血小板减少：已证实'],
            text: ['胆管炎能解释吗？', 'ADAMTS13 的结果已经给出了更直接的解释。'],
          },
        ],
        need: [
          {
            cards: ['SLE 背景与 iTTP：支持相关', 'LA 阳性＋妊娠丢失→APS：值得评估', 'SLE＋蛋白尿→肾受累：疑似，待评估'],
            text: ['自身免疫背景和其他问题之间，有什么联系？', '把免疫学结果和 iTTP、肾、妊娠丢失分别联系起来看。'],
          },
        ],
      },
    },
    {
      id: 'Q6.3', title: '哪些问题尚未解决？', categories: ['未解问题'],
      insufficient: '未解问题还没说清楚。',
      hints: [
        '哪些关系你刚才只敢说“可能”“待评估”？',
        '胆道这条线，和免疫这条线，各还缺什么？',
        '胆管狭窄／梗阻的病因未证实；抗磷脂抗体是否持续阳性、妊娠丢失和肾受累的病因也还待评估。',
      ],
      spec: {
        support: {},
        wrong: [
          { cards: ['所有问题都已解决'], text: ['真的都解决了？', '胆道和免疫这两条线，还有没证实的地方。'] },
          {
            cards: ['补体未活化，可排除补体介导 TMA'],
            text: ['补体的资料能这么用吗？', '原文没给项目和数值，C3/C4 又记显著减低，不能据此绝对排除。'],
          },
        ],
        need: [
          {
            cards: ['胆管狭窄／梗阻的病因', '结石成分未知'],
            text: ['胆道这边，还有什么没搞清楚？', '狭窄和梗阻的原因，证实了吗？'],
          },
          {
            cards: ['抗磷脂抗体是否持续阳性', '妊娠丢失的病因', '肾受累的病因'],
            text: ['免疫相关的问题，还有哪些待评估？', '妊娠丢失、抗磷脂、肾受累，至少说一个还缺什么。'],
          },
        ],
      },
    },
  ],
  cards: [
    {
      category: '诊断', color: 'dx',
      cards: [
        '胆道梗阻／胆管炎', 'iTTP', 'SLE（高度考虑）', '胎死宫内', 'APS（待评估）', '肾受累（待评估）',
        'APS（确诊）', '狼疮肾炎（确诊）', '遗传性 TTP',
      ],
    },
    {
      category: '关联', color: 'mech',
      cards: [
        'SLE 背景与 iTTP：支持相关', 'SLE 背景导致 iTTP：已证实',
        '溶血→色素结石→梗阻：可能机制，未证实', '溶血→色素结石→梗阻：已证实',
        'LA 阳性＋妊娠丢失→APS：值得评估', 'SLE＋蛋白尿→肾受累：疑似，待评估', 'iTTP 与肾、神经受累：支持相关',
        '胆管炎可以解释血小板减少：已证实',
      ],
    },
    {
      category: '未解问题', color: 'test',
      cards: [
        '胆管狭窄／梗阻的病因', '结石成分未知', '抗磷脂抗体是否持续阳性', '妊娠丢失的病因', '肾受累的病因',
        'SLE 与 iTTP 的具体发病链', '所有问题都已解决', '补体未活化，可排除补体介导 TMA',
      ],
    },
  ],
  seniorHints: [],
  afterReport: {
    lines: [
      { who: '刘主任', text: '好。哪些已经确定，哪些还只是可能，你分得很清楚。' },
      { who: '风湿免疫科', text: '我们的会诊意见：考虑 SLE。' },
    ],
    next: 'reveal',
    collect: [...E31_ITEMS, ...E32_ITEMS].map((i) => i.id),
  },
  reveal: {
    title: '会诊意见与原病例后记',
    items: [...E31_ITEMS, ...E32_ITEMS],
    note: '以上是原病例记载的会诊意见与后记，不因你的选择而改变。',
    next: 'ending',
  },
  core: [],
  ideal: { clinical: 3, patient: 0 },
  endLine: '',
};

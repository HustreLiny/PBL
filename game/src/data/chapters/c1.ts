import { DIALOG_ITEMS as D, itemsOf } from '../items';
import { asked, historyTopics, HISTORY_ITEMS, missingLine } from './common';
import type { ChapterDef } from './types';

// 第一章：黄灯停（设计稿第 5 节）。床旁问诊、查体，梳理临床特点、黄疸机制与初步判断。

const EXAM = '旁白' as const;

export const C1: ChapterDef = {
  id: 'c1',
  no: '第一章',
  title: '黄灯停',
  scenes: {
    bed: {
      name: '急诊床旁', art: 'scene-er-bed', width: 720, spawn: 560,
      hotspots: [
        { id: 'monitor', kind: 'person', label: '监护仪', x: 70, lift: 40, who: '旁白' },
        { id: 'patient', kind: 'person', label: '患者', x: 180, art: 'sprite-patient', who: '患者' },
        { id: 'family', kind: 'person', label: '家属', x: 300, art: 'sprite-family', who: '家属' },
        { id: 'senior', kind: 'senior', label: '师姐', x: 470, art: 'sprite-senior', who: '师姐' },
        { id: 'his', kind: 'his', label: '护理车电脑', x: 640 },
      ],
    },
  },
  startScene: 'bed',
  topics: [
    {
      id: 'pt-route', person: 'patient', label: '问路上有什么变化',
      lines: [
        { who: '你', text: '从外院过来的路上，有什么变化吗？' },
        { who: '患者', text: '家里人说我比早上更黄了。', item: D.jaundice },
        { who: '患者', text: '右边肚子这里疼。' },
        { who: '你', text: '0 到 10 分的话，有几分？' },
        { who: '患者', text: '5 分吧。', item: D.pain },
      ],
    },
    {
      id: 'pt-neuro', person: 'patient', label: '问头痛和精神状况',
      lines: [
        { who: '你', text: '头痛怎么样？有没有看东西模糊、手脚没劲、抽搐？' },
        { who: '患者', text: '头一直疼……别的说不上来。', item: D.neuro },
        { who: '旁白', text: '目前资料没有记录意识改变、抽搐等情况。没记录不等于没有，需要继续评估。' },
      ],
    },
    {
      id: 'exam-skin', person: 'patient', label: '查体：皮肤、黏膜与一般情况',
      lines: [
        { who: EXAM, text: '她面色苍白，巩膜和皮肤重度黄染。', item: D.general },
        { who: EXAM, text: '前胸和前臂散在瘀点，牙龈有渗血。', item: D.bleed },
      ],
    },
    {
      id: 'exam-abd', person: 'patient', label: '查体：腹部',
      lines: [{ who: EXAM, text: '腹软，右上腹轻压痛，无反跳痛及肌紧张，Murphy 征阴性。', item: D.abdomen }],
    },
    ...historyTopics('patient'),
    {
      id: 'fam-route', person: 'family', label: '问家属路上的情况',
      lines: [
        { who: '家属', text: '路上烧到 39 度，还一阵一阵地打寒战。', item: D.chill },
        { who: '家属', text: '医生，她到底怎么了？' },
      ],
    },
    {
      id: 'monitor-vitals', person: 'monitor', label: '看生命体征',
      lines: [{ who: '旁白', text: '监护仪：BP 150/90，HR 120，RR 20，T 39℃。', item: D.vitals }],
    },
  ],
  opening: () => [
    { who: '师姐', text: '去床旁看看她。路上的变化问清楚，查体做了。' },
    { who: '师姐', text: '想做什么检查、评估，跟我说，我帮你记下。' },
  ],
  exitLabel: '“差不多了，去找主任汇报吧。”',
  blockers: (s) => {
    const miss: string[] = [];
    if (!asked(s, 'pt-route') || !asked(s, 'fam-route')) miss.push('路上变化的核实（患者和家属都可以问）');
    if (!asked(s, 'monitor-vitals')) miss.push('当前生命体征');
    if (!asked(s, 'exam-skin')) miss.push('皮肤黏膜查体');
    if (!asked(s, 'exam-abd')) miss.push('当前腹部评估');
    if (!asked(s, 'pt-neuro') || !s.suggestions.includes('neuro')) miss.push('神经症状的评估和复评需求');
    if (!s.suggestions.includes('fetal')) miss.push('胎儿评估任务');
    return missingLine(miss);
  },
  optionalItems: HISTORY_ITEMS,
  goLines: [{ who: '师姐', text: '好，主任在办公室，去汇报吧。' }],
  questions: [
    {
      id: 'Q1.1', title: '有哪些临床特点？', categories: ['临床特点'],
      insufficient: '临床特点的归纳还不完整。',
      hints: [
        '按系统梳理：主诉、体温、腹部、皮肤黏膜。',
        '黄疸、发热寒战、腹痛之外，床旁查体还发现了什么？',
        '黄疸加深、发热寒战、右上腹痛，再加上瘀点、牙龈渗血和贫血貌，这些都要列出来。',
      ],
      spec: {
        support: {
          黄疸进行性加深: { groups: [['E01', 'E03', 'E05']], where: '交班或床旁的黄染记录' },
          发热伴寒战: { groups: [['E01', 'E03', 'E04']], where: '体温和寒战的记录' },
          右上腹痛: { groups: [['E03', 'E06']], where: '问诊的腹痛或腹部查体' },
          皮肤黏膜出血: { groups: [['E01', 'E05']], where: '皮肤黏膜查体或牙龈出血的记录' },
          贫血貌: { groups: [['E05']], where: '一般情况的查体' },
          头痛: { groups: [['E01', 'E07']], where: '头痛的记录' },
          心率增快: { groups: [['E04']], where: '生命体征' },
          血压偏高: { groups: [['E04']], where: '生命体征' },
          孕中期: { groups: [['E01']], where: '交班信息' },
        },
        wrong: [
          { cards: ['Murphy 征阳性', '腹膜刺激征'], text: ['标出来的这一条，和查体记录对得上吗？', '再看一遍腹部查体的原始记录。'] },
          { cards: ['意识障碍'], text: ['标出来的这条，原始记录里有吗？', '材料只记录了头痛。没记录的，不能写成有。'] },
        ],
        need: [
          { cards: ['黄疸进行性加深'], text: ['最主要的主诉，你还没写进去。', '黄疸有没有变化？交班和床旁都提到了。'] },
          { cards: ['发热伴寒战'], text: ['体温方面呢？', '路上的体温和寒战，家属说过。'] },
          { cards: ['右上腹痛'], text: ['腹部有什么表现？', '问诊的腹痛和腹部查体都可以用。'] },
          { cards: ['皮肤黏膜出血', '贫血貌'], text: ['黄疸之外，还有什么值得警惕的表现？', '看看皮肤黏膜的查体，还有牙龈。'] },
        ],
      },
    },
    {
      id: 'Q1.2', title: '如何解释黄疸？', categories: ['黄疸机制'],
      insufficient: '黄疸的解释还不充分。',
      hints: [
        '外院化验里，哪些指标能反映胆汁排泄？',
        '看直接胆红素、GGT 和 ALP。',
        'GGT、ALP 升高，直接胆红素占一部分，提示胆汁淤积或肝胆梗阻的线索；是否还有别的机制叠加，现在可以先保留。',
      ],
      spec: {
        support: {
          '胆汁淤积（可能）': { groups: [['E02']], where: '外院化验' },
          肝胆梗阻线索: { groups: [['E02', 'E03', 'E06']], where: '外院化验或腹部表现' },
          '肝细胞损伤（可能）': { groups: [['E02']], where: '外院化验' },
          '溶血参与（待证实）': { groups: [['E02', 'E05']], where: '外院化验或贫血貌' },
          '混合机制（可能）': { groups: [['E02']], where: '外院化验' },
        },
        wrong: [
          { cards: ['溶血已确诊'], text: ['这个结论下得太早。', '只凭 LDH 一项，能确定溶血吗？可以写成“待证实”。'] },
          { cards: ['可排除肝炎'], text: ['标出来的这条，证据够吗？', '转氨酶只是轻中度升高，不能据此排除所有肝炎。'] },
          { cards: ['单纯肝细胞性黄疸（确定）'], text: ['确定得太早了。', 'GGT、ALP 也升高了，现在的资料只支持一种机制吗？'] },
        ],
        need: [
          {
            cards: ['胆汁淤积（可能）', '肝胆梗阻线索', '混合机制（可能）'],
            text: ['外院化验里，哪些指标提示胆汁排出有问题？', '看 GGT、ALP 和直接胆红素。'],
          },
        ],
      },
    },
    {
      id: 'Q1.3', title: '目前有哪些判断？', categories: ['初步判断'],
      insufficient: '初步判断还不充分。',
      hints: [
        '把问题分成几组，不必现在就定病名。',
        '发热、腹痛、黄疸是一组，出血和贫血貌是另一组。',
        '肝胆感染或梗阻需要关注；出血与贫血貌提示血液方面的问题，需要单独保留。',
      ],
      spec: {
        support: {
          '肝胆系统感染（待查）': { groups: [['E01', 'E03', 'E04']], where: '发热、寒战或生命体征' },
          '胆道梗阻（待查）': { groups: [['E02', 'E03', 'E06']], where: '外院化验或腹部表现' },
          '出血倾向／血液系统异常（待查）': { groups: [['E01', 'E05']], where: '出血表现或贫血貌' },
          '妊娠相关问题（待鉴别）': { groups: [['E01', 'E04']], where: '孕周或血压' },
          神经系统需评估: { groups: [['E01', 'E07']], where: '头痛的记录' },
        },
        wrong: [
          {
            cards: ['单一疾病可解释全部（确定）'],
            text: ['一个结论包办所有异常，依据够吗？', '先把问题分开列，暂时说不清的就标“待查”。'],
          },
          {
            cards: ['妊娠期急性脂肪肝（确诊）', 'HELLP 综合征（确诊）'],
            text: ['现在能确诊吗？', '现有资料还不足以确诊，可以作为待鉴别的方向。'],
          },
        ],
        need: [
          {
            cards: ['肝胆系统感染（待查）', '胆道梗阻（待查）'],
            text: ['发热、腹痛和黄疸放在一起，你怎么看？', '肝胆方向的问题要列出来。'],
          },
          {
            cards: ['出血倾向／血液系统异常（待查）'],
            text: ['出血和贫血貌，怎么归类？', '血液方面的问题也要单独列出来。'],
          },
        ],
      },
    },
  ],
  cards: [
    {
      category: '临床特点', color: 'trend',
      cards: [
        '黄疸进行性加深', '发热伴寒战', '右上腹痛', '皮肤黏膜出血', '贫血貌', '头痛', '心率增快', '血压偏高', '孕中期',
        'Murphy 征阳性', '意识障碍', '腹膜刺激征',
      ],
    },
    {
      category: '黄疸机制', color: 'mech',
      cards: [
        '胆汁淤积（可能）', '肝胆梗阻线索', '肝细胞损伤（可能）', '溶血参与（待证实）', '混合机制（可能）',
        '溶血已确诊', '可排除肝炎', '单纯肝细胞性黄疸（确定）',
      ],
    },
    {
      category: '初步判断', color: 'dx',
      cards: [
        '肝胆系统感染（待查）', '胆道梗阻（待查）', '出血倾向／血液系统异常（待查）', '妊娠相关问题（待鉴别）', '神经系统需评估',
        '单一疾病可解释全部（确定）', '妊娠期急性脂肪肝（确诊）', 'HELLP 综合征（确诊）',
      ],
    },
  ],
  seniorHints: [
    { text: '有没有注意到她说路上更黄了、右上腹疼？', items: [D.jaundice, D.pain] },
    { text: '有没有注意到家属说路上烧到 39 度、打寒战？', items: [D.chill] },
    { text: '有没有注意到监护仪上的数字？', items: [D.vitals] },
    { text: '有没有注意到查体时皮肤黏膜的情况？', items: [D.general, D.bleed] },
    { text: '有没有注意到腹部查体的结果？', items: [D.abdomen] },
    { text: '有没有注意到她说头一直疼？', items: [D.neuro] },
  ],
  afterReport: {
    lines: [
      { who: '刘主任', text: '好。黄疸、感染、出血，几条线都列出来了，也没有急着下结论。' },
      { who: '刘主任', text: '急诊的化验和影像陆续回来了，去看看。' },
    ],
    next: 'chapterEnd',
  },
  core: itemsOf('E03', 'E04', 'E05', 'E06', 'E07'),
  ideal: { clinical: 3, patient: 0 },
  endLine: '几条线索已经分开列好。新的报告会说明什么？',
};

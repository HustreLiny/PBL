import { E19_ITEMS } from '../items';
import { opened, workstation } from './common';
import type { TalkNode } from '../story';
import type { ChapterDef } from './types';

// 第四章：乱麻（设计稿第 8 节）。产科超声回报后，与患者和家属谈 ERCP 知情同意，再汇报处置方案。

const CONSENT: TalkNode[] = [
  {
    id: 'open',
    prompt: [{ who: '旁白', text: '谈话室里，她靠在轮椅上，眼睛是红的。家属站在一旁。' }],
    options: [
      {
        text: '先坐下来，问她身体撑不撑得住，愿不愿意让家属一起听。', patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '……一起听吧。' }],
      },
      {
        text: '请家属先出来，单独和家属谈手术的事。', patient: -1, clinical: 0,
        replies: [{ who: '患者', text: '是我的身体，为什么不跟我说？' }],
      },
    ],
  },
  {
    id: 'baby',
    prompt: [{ who: '患者', text: '孩子的事……产科医生说了。能再跟我解释一下吗？' }],
    options: [
      {
        text: '放慢语速，如实确认超声没有看到胎心；停下来给她时间，告诉她产科会一起安排后面的处理。', patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '……嗯。' }, { who: '旁白', text: '她沉默了很久，轻轻点了点头。' }],
      },
      {
        text: '“这个产科会跟你说，我们先说手术的事。”', patient: -1, clinical: 0,
        replies: [{ who: '旁白', text: '她别过脸去。' }],
      },
      {
        text: '“别太难过，你还年轻，以后还能再要。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '医生，这种时候说这个……' }],
      },
    ],
  },
  {
    id: 'why',
    prompt: [{ who: '患者', text: '为什么还需要做这个操作？' }],
    options: [
      {
        text: '“胆管下面堵住了，胆汁排不出去，还合并了感染。把胆管疏通引流，是控制感染最要紧的一步；拖下去感染可能加重，危及生命。”',
        patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '……原来是这样。' }],
      },
      {
        text: '“胆总管下段狭窄合并急性胆管炎，需要行 ERCP 胆道引流。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '……医生，我们听不太懂。' }],
      },
      {
        text: '“不做就没命了。”', patient: -1, clinical: 0,
        replies: [{ who: '旁白', text: '她的手抖了一下。' }],
      },
    ],
  },
  {
    id: 'bleed',
    prompt: [{ who: '家属', text: '血小板这么低，做了会不会大出血？' }],
    options: [
      {
        text: '“您担心得对，血小板低确实会增加出血风险。团队会评估出血风险、提前做准备，但没有办法保证完全没有风险。”',
        patient: 1, clinical: 0,
        replies: [{ who: '家属', text: '好……你们评估过就好。' }],
      },
      {
        text: '“放心，不会出血的。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '真的吗……' }],
      },
      {
        text: '“那就等血小板升上来再做。”', patient: -1, clinical: -2,
        replies: [
          { who: '刘主任', text: '（推门进来）梗阻合并感染，等不起。出血风险我们评估、准备，操作要尽快。' },
          { who: '家属', text: '你们到底谁说了算？' },
        ],
      },
    ],
  },
  {
    id: 'alt',
    prompt: [{ who: '家属', text: '有没有别的办法？' }],
    options: [
      {
        text: '“引流有不同的方式，各有利弊。团队会根据她的情况选择合适的方式，有变化会再和你们商量。”', patient: 1, clinical: 0,
        replies: [{ who: '家属', text: '明白了。' }],
      },
      {
        text: '“没有别的办法，只能这样。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '……' }],
      },
    ],
  },
  {
    id: 'close',
    prompt: [{ who: '旁白', text: '该说的都说了。' }],
    options: [
      {
        text: '请她用自己的话说说理解了什么，问还有没有想问的；告诉她可以先和家人商量一下。', patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '我明白了。我们商量一下，一会儿签字。' }],
      },
      {
        text: '把同意书推过去：“没问题就签字吧，快一点。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '……' }],
      },
    ],
  },
];

export const C4: ChapterDef = {
  id: 'c4',
  no: '第四章',
  title: '乱麻',
  scenes: {
    station: workstation('去谈话室', 'talkroom'),
    talkroom: {
      name: '谈话室', art: 'scene-talkroom', width: 480, spawn: 80,
      hotspots: [
        { id: 'door', kind: 'door', label: '回工作站', x: 28, to: 'station' },
        { id: 'family', kind: 'talk', label: '患者和家属', x: 300, art: 'sprite-family' },
      ],
    },
  },
  startScene: 'station',
  topics: [],
  opening: (s) => [
    ...(s.suggestions.includes('fetal')
      ? [{ who: '师姐' as const, text: '你之前提的胎儿评估，产科已经做了超声，结果在 HIS 上。' }]
      : [{ who: '师姐' as const, text: '产科做了超声，结果在 HIS 上。' }]),
    { who: '师姐', text: '团队倾向尽快胆道引流。看完结果，要去谈话室和她们谈知情同意。' },
  ],
  exitLabel: '“谈完了，去找主任汇报吧。”',
  blockers: (s) => {
    if (!opened(s, 'R-E16')) return [{ who: '师姐', text: '产科超声的结果看了吗？在 HIS 上。' }];
    if (!s.talkDone) return [{ who: '师姐', text: '还没和她们谈过。去谈话室吧。' }];
    return null;
  },
  goLines: [{ who: '师姐', text: '好，主任在等你的方案。' }],
  questions: [
    {
      id: 'Q4.1', title: '处置方案是什么？', categories: ['处置', '评估与协作'],
      insufficient: '处置方案还不完整。',
      hints: [
        '现在最危险的是什么？先处理它。',
        '梗阻和感染各需要什么处理？',
        '团队评估下及时胆道引流，同时抗感染；评估出血风险，与产科协调。',
      ],
      spec: {
        support: {
          '及时胆道引流（团队评估下）': { groups: [['E12']], where: 'MRCP 的结果' },
          抗感染: { groups: [['E03', 'E04', 'E08', 'E11']], where: '感染相关的表现或指标' },
          评估出血风险: { groups: [['E08', 'E10']], where: '血常规或凝血' },
          产科评估与协调: { groups: [['E16']], where: '产科超声' },
          血液科会诊: { groups: [['E08']], where: '血常规' },
          监测生命体征: { groups: [['E04']], where: '生命体征' },
        },
        wrong: [
          {
            cards: ['暂不处理，观察', '等所有检查结果齐了再引流'], crash: true,
            text: ['梗阻合并感染，等得起吗？', '胆道要尽快减压，不能干等。'],
          },
          { cards: ['必须一次取净结石'], text: ['一定要一次取净吗？', '先解决引流，具体方式由团队根据情况决定。'] },
        ],
        need: [
          { cards: ['及时胆道引流（团队评估下）'], text: ['梗阻合并感染，最要紧的处理是什么？', '胆道要尽快减压。'] },
          { cards: ['抗感染'], text: ['感染怎么办？', '胆管炎需要抗感染。'] },
        ],
      },
    },
    {
      id: 'Q4.2', title: '如何权衡利弊？', categories: ['获益', '风险与协调'],
      insufficient: '利弊的权衡还不充分。',
      hints: [
        '为什么值得冒险做？冒的是什么险？',
        '获益看梗阻和感染；风险看血小板和凝血；别忘了产科。',
        '引流能解除梗阻、控制感染；PLT 18 增加操作出血风险，需要团队评估；胎死宫内需要产科同步处理。',
      ],
      spec: {
        support: {
          '引流可解除梗阻、控制感染': { groups: [['E12']], where: 'MRCP 的结果' },
          不引流感染可能加重: { groups: [['E03', 'E04', 'E08', 'E11']], where: '感染相关的表现或指标' },
          '血小板低，操作出血风险高': { groups: [['E08']], where: '血常规' },
          凝血指标需一并评估: { groups: [['E10']], where: '凝血结果' },
          胎死宫内需产科同步处理: { groups: [['E16']], where: '产科超声' },
        },
        wrong: [
          { cards: ['血小板低于某值绝对不能做'], text: ['有这样一刀切的规则吗？', '风险由团队综合评估，不设固定阈值。'] },
          { cards: ['必须先把血小板输到正常'], text: ['一定要先输到正常吗？', '输不输、输多少，由团队评估，不设固定规则。'] },
          { cards: ['胎儿已无胎心，无需考虑产科'], text: ['产科就不用管了吗？', '胎死宫内本身也需要处理，要和产科协调。'] },
        ],
        need: [
          {
            cards: ['引流可解除梗阻、控制感染', '不引流感染可能加重'],
            text: ['为什么值得冒这个险？', '说说引流的获益，或者不引流的后果。'],
          },
          { cards: ['血小板低，操作出血风险高'], text: ['风险方面呢？', 'PLT 18 对操作意味着什么？'] },
          {
            cards: ['胎死宫内需产科同步处理', '由团队共同评估时机'],
            text: ['母体和产科的情况考虑了吗？', '产科超声的结果，要纳入权衡。'],
          },
        ],
      },
    },
    {
      id: 'Q4.3', title: '如何交代病情？', categories: ['交代要点'],
      insufficient: '病情交代还不完整。',
      hints: [
        '回想刚才的谈话：你说了哪些，她们问了哪些？',
        '病情、必要性、风险、替代方案，一样都不能少；胎儿的结果要如实承接。',
        '先面向患者本人；讲清当前病情和超声结果、引流的必要性与不做的风险、出血等操作风险、替代方案和不确定性；不承诺零风险。',
      ],
      spec: {
        support: {
          当前已知病情: { groups: [['E12', 'E03', 'E08']], where: '胆道或化验的资料' },
          胎儿情况如实告知: { groups: [['E16']], where: '产科超声' },
          引流的必要性: { groups: [['E12']], where: 'MRCP 的结果' },
          '操作风险（含出血）': { groups: [['E08']], where: '血常规' },
        },
        wrong: [
          { cards: ['保证手术没有风险'], text: ['能保证吗？', '不能承诺零风险。'] },
          { cards: ['暂时不告诉她胎儿情况'], text: ['能瞒着她吗？', '她有权知道，要承接产科超声的结果。'] },
          { cards: ['只和家属谈'], text: ['患者本人呢？', '她能参与决策，先面向她。'] },
        ],
        need: [
          { cards: ['当前已知病情'], text: ['先说现在知道了什么。', '胆道的问题要讲清楚。'] },
          { cards: ['胎儿情况如实告知'], text: ['产科的结果，谈话里怎么处理？', '要承接产科超声的结果，如实说明。'] },
          { cards: ['引流的必要性', '不处理的风险'], text: ['为什么要做？', '说明必要性，或者不做的后果。'] },
          { cards: ['操作风险（含出血）'], text: ['风险讲了吗？', '血小板这么低，出血风险要讲。'] },
          { cards: ['替代方案与不确定性'], text: ['还有别的选择吗？结果一定吗？', '替代方案和不确定性也要交代。'] },
        ],
      },
    },
  ],
  cards: [
    {
      category: '处置', color: 'tx',
      cards: ['及时胆道引流（团队评估下）', '抗感染', '暂不处理，观察', '等所有检查结果齐了再引流', '必须一次取净结石'],
    },
    { category: '评估与协作', color: 'test', cards: ['评估出血风险', '产科评估与协调', '血液科会诊', '监测生命体征'] },
    { category: '获益', color: 'trend', cards: ['引流可解除梗阻、控制感染', '不引流感染可能加重'] },
    {
      category: '风险与协调', color: 'overall',
      cards: [
        '血小板低，操作出血风险高', '凝血指标需一并评估', '胎死宫内需产科同步处理', '由团队共同评估时机',
        '血小板低于某值绝对不能做', '必须先把血小板输到正常', '胎儿已无胎心，无需考虑产科',
      ],
    },
    {
      category: '交代要点', color: 'mech',
      cards: [
        '先征求患者本人意见', '当前已知病情', '胎儿情况如实告知', '引流的必要性', '不处理的风险', '操作风险（含出血）',
        '替代方案与不确定性', '保证手术没有风险', '暂时不告诉她胎儿情况', '只和家属谈',
      ],
    },
  ],
  seniorHints: [],
  talk: {
    title: 'ERCP 知情同意',
    nodes: CONSENT,
    gate: (s) => {
      if (s.talkDone) return [{ who: '家属', text: '医生，刚才说的我们都明白了。' }];
      if (!opened(s, 'R-E16')) return [{ who: '师姐', text: '先把产科超声的结果看了，再去谈。' }];
      return null;
    },
    finish: (s, delta) => {
      if (delta <= -2 && s.talkTries === 0)
        return {
          lines: [
            { who: '家属', text: '你们这样……要不我们转去别的医院吧。' },
            { who: '刘主任', text: '（低声）换个方式，再跟她们好好谈一次。' },
          ],
          next: 'talk',
          ledger: [{ kind: '转院警告', clinical: 0, patient: -1, note: '知情同意谈话失败，家属提出转院' }],
        };
      if (delta <= -2)
        return {
          lines: [
            { who: '刘主任', text: '我来跟你们解释。' },
            { who: '旁白', text: '刘主任接过话，重新谈了一遍。家属最终签了字，但没有再看你。' },
          ],
          next: 'explore',
          ledger: [{ kind: '上级介入', clinical: -1, patient: -1, note: '知情同意谈话再次失败，刘主任接手' }],
        };
      return {
        lines: [{ who: '旁白', text: '同意书签好了。' }, { who: '师姐', text: '谈完了？去找主任汇报方案吧。' }],
        next: 'explore',
      };
    },
  },
  crashCorrection: '不能等。梗阻合并感染，团队评估后尽快引流，同时抗感染。',
  afterReport: {
    lines: [
      { who: '刘主任', text: '方案可以。去安排吧。' },
      { who: '旁白', text: '团队完成了 ERCP。' },
      { who: '师姐', text: 'ERCP 做完了，记录给你。后续的复查资料会送过来。' },
    ],
    next: 'reveal',
    collect: E19_ITEMS.map((i) => i.id),
  },
  reveal: {
    title: 'ERCP 记录',
    items: E19_ITEMS,
    note: '以上为本次 ERCP 的操作记录。黑胆汁不等于已经证实的结石成分。',
    next: 'chapterEnd',
  },
  core: ['E16.1', ...E19_ITEMS.map((i) => i.id)],
  ideal: { clinical: 3, patient: 6 },
  endLine: '引流通畅，黄疸会退。可是，这就结束了吗？',
};

import type { Item, QuestionId } from '../types';
import { DIALOG_ITEMS } from './items';
import type { Line, Speaker, TalkNode, Topic } from './story';
import { historyTopics, HISTORY_ITEMS } from './chapters/common';

// 第五章内容（附录 E）。章节定义见 chapters/c5.ts。

export const TOPICS: Topic[] = [
  {
    id: 'nurse-handover', person: 'nurse', label: '听交班',
    lines: [
      { who: '护士', text: '今天体温还是高。', item: DIALOG_ITEMS.fever },
      { who: '护士', text: '她说头还是疼。', item: DIALOG_ITEMS.headache },
      { who: '护士', text: '尿检和抽血的结果都出来了，在 HIS 上。' },
    ],
  },
  {
    id: 'pt-feel', person: 'patient', label: '问她现在感觉怎么样',
    lines: [
      { who: '你', text: '现在感觉怎么样？' },
      { who: '患者', text: '头还是疼。', item: DIALOG_ITEMS.headache },
    ],
  },
  ...historyTopics('patient'),
];

export const OPENING: Line[] = [
  { who: '师姐', text: '引流通畅。复查结果出来了，在 HIS 上，你先看看，再说说接下来重点盯什么。' },
];
export const OPENING_SUGGESTED: Line[] = [
  { who: '师姐', text: '引流通畅。复查结果出来了，在 HIS 上。你之前提出的那个问题，需要结合这次复查继续判断。' },
];

export const CRASH_CORRECTION = '不能等。先在治疗前留好 ADAMTS13 的标本，马上联系血液科，准备血浆置换。';

export const HINTS: Record<QuestionId, [string, string, string]> = {
  'Q5.1': [
    '比较术前和术后，别只看一类指标。',
    '血常规、LD、肾功能和交班记录里的症状也有变化。',
    '胆红素下降说明引流有效；但 HGB 从 70 降到 60，PLT 仍然只有约 20，说明另有问题在持续。',
  ],
  'Q5.2': [
    '什么过程能同时解释贫血加重和血小板持续极低？',
    '把网织红、涂片和血小板放在一起看。',
    '大量破碎红细胞加上网织红升高，提示微血管病性溶血；再合并严重血小板减少，应考虑 TMA，其中 TTP 需要紧急鉴别。',
  ],
  'Q5.3': [
    '如果检查结果要几天后才回来，你的方案还成立吗？',
    '想一想诊断性检查和救治措施之间的先后关系。',
    '高度怀疑 TTP 时，先在治疗前留好 ADAMTS13 标本，再尽快联系血液科，启动血浆置换和糖皮质激素，不等结果。',
  ],
};

// ---------- MDT（附录 E.5） ----------

export type MdtRoundId = 'hema' | 'icu' | 'gi' | 'ob';
export type MdtResult = 'persuade' | 'partial' | 'none' | 'crash';

export interface MdtRound {
  id: MdtRoundId;
  who: Speaker;
  art: string;
  challenge: string;
  replies: Record<MdtResult, Line[]>;
}

export const MDT_ROUNDS: MdtRound[] = [
  {
    id: 'hema', who: '血液科', art: 'portrait-hema',
    challenge: 'ADAMTS13 还没回来，现在就上血浆置换，依据呢？',
    replies: {
      persuade: [{ who: '血液科', text: '破碎红细胞、网织红升高，血小板一直起不来……好，标本先留，今天就上置换。' }],
      partial: [{ who: '血液科', text: '依据还不够完整。不过这个方向我同意，先准备着。' }],
      none: [{ who: '血液科', text: '我还是没看到足够的依据。' }],
      crash: [{ who: '刘主任', text: CRASH_CORRECTION }, { who: '血液科', text: '同意主任的意见，我这就去安排。' }],
    },
  },
  {
    id: 'icu', who: 'ICU', art: 'portrait-icu',
    challenge: '她还在发热、头痛，肌酐也在升，这些你怎么看？',
    replies: {
      persuade: [{ who: 'ICU', text: '肾和神经都有受累迹象。那我这边按高危患者加强监护。' }],
      partial: [{ who: 'ICU', text: '肌酐在升我看到了。受累的范围你再想想。' }],
      none: [{ who: 'ICU', text: '我不同意“好转”这个判断。' }],
      crash: [],
    },
  },
  {
    id: 'gi', who: '消化科', art: 'portrait-gi',
    challenge: '发热会不会还是胆管炎没控制？要不要再做一次 ERCP？',
    replies: {
      persuade: [{ who: '消化科', text: '引流是通的，胆红素也在降，现在的问题更像另一回事。抗感染可以继续。' }],
      partial: [{ who: '消化科', text: '引流有效我认同，但剩下的异常你怎么解释？' }],
      none: [{ who: '刘主任', text: '引流是通畅的。再做一次 ERCP，解决不了现在的问题。' }],
      crash: [],
    },
  },
  {
    id: 'ob', who: '产科', art: 'portrait-ob',
    challenge: '胎死宫内的处理时机，怎么和血浆置换衔接？',
    replies: {
      persuade: [{ who: '产科', text: '好，我们同步评估，时机和血液科一起商量，不耽误置换。' }],
      partial: [{ who: '产科', text: '我们会评估。但怎么和置换衔接，你还没说。' }],
      none: [{ who: '刘主任', text: '需要协调，但救治不能等。' }],
      crash: [],
    },
  },
];

export type Column = 'now' | 'parallel' | 'after';
export const COLUMNS: { id: Column; label: string }[] = [
  { id: 'now', label: '立即' },
  { id: 'parallel', label: '同时进行' },
  { id: 'after', label: '结果回报后' },
];
export const ORDER_CARDS = [
  '治疗前取血送 ADAMTS13 活性', '联系血液科', '血浆置换', '糖皮质激素', '继续抗感染', '产科评估与协调', '复核诊断',
];
export const IDEAL_ORDER: Record<string, Column> = {
  '治疗前取血送 ADAMTS13 活性': 'now',
  联系血液科: 'now',
  血浆置换: 'now',
  糖皮质激素: 'now',
  继续抗感染: 'parallel',
  产科评估与协调: 'parallel',
  复核诊断: 'after',
};

// ---------- 洽谈（附录 E.6） ----------

export const TALK_NODES: TalkNode[] = [
  {
    id: 'open',
    prompt: [{ who: '旁白', text: '你走进病房。她靠在床头，家属坐在旁边。' }],
    options: [
      {
        text: '先向她打招呼，问她是否愿意让家属一起听。', patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '……一起听吧。' }],
      },
      {
        text: '示意家属到走廊，单独和家属谈。', patient: -1, clinical: 0,
        replies: [{ who: '患者', text: '有什么不能当着我说的吗？' }],
      },
    ],
  },
  {
    id: 'core',
    prompt: [{ who: '旁白', text: '你需要告诉她最新的情况。' }],
    options: [
      {
        text: '“胆道引流是有效的，黄疸在退。但血液化验显示还有另一个更要紧的问题，我们需要马上处理。”',
        patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '另一个问题？' }],
      },
      {
        text: '“你有 MAHA，考虑 TMA，疑似 TTP。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '……医生，你说的这些我们听不懂。' }],
      },
      {
        text: '“情况很危险，随时可能出事。”', patient: -1, clinical: 0,
        replies: [{ who: '旁白', text: '她攥紧了被角，没有说话。' }],
      },
    ],
  },
  {
    id: 'why',
    prompt: [{ who: '患者', text: '黄疸退了，不是在变好吗？' }],
    options: [
      {
        text: '“黄疸退了是好事。但血管里的红细胞还在被破坏，血小板也一直很低，这是另一个病在起作用。”',
        patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '……所以还没好。' }],
      },
      {
        text: '“这个说了你也不懂，交给我们就行。”', patient: -1, clinical: 0,
        replies: [{ who: '旁白', text: '她把头转向了窗户。' }],
      },
    ],
  },
  {
    id: 'wait',
    prompt: [{ who: '家属', text: '要不等化验结果出来再说？' }],
    options: [
      {
        text: '“化验的标本我们会在治疗前先留好，结果要几天才回来。但这个病拖不起，治疗需要现在就开始。”',
        patient: 1, clinical: 0,
        replies: [{ who: '家属', text: '……明白了。' }],
      },
      {
        text: '“也行，那就等等看。”', patient: -2, clinical: -2,
        replies: [
          { who: '刘主任', text: '（推门进来）不能等。标本先留，治疗今天就开始，我来跟你们解释。' },
          { who: '家属', text: '医生，你们到底确不确定？' },
        ],
      },
      {
        text: '“不做的话，后果你们自负。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '你这是什么态度？' }],
      },
    ],
  },
  {
    id: 'risk',
    prompt: [{ who: '家属', text: '换血浆有风险吗？' }],
    options: [
      {
        text: '“有风险，比如过敏、置管相关的问题。团队会全程监测、提前准备，但没有办法保证完全没有风险。”',
        patient: 1, clinical: 0,
        replies: [{ who: '家属', text: '好，有什么情况你们及时告诉我们。' }],
      },
      {
        text: '“没什么风险，放心吧。”', patient: -1, clinical: 0,
        replies: [{ who: '家属', text: '那就好……' }],
      },
    ],
  },
  {
    id: 'baby',
    prompt: [{ who: '旁白', text: '她沉默了一会儿。' }, { who: '患者', text: '孩子的事……' }],
    options: [
      {
        text: '停下来，轻声问她现在想不想谈；告诉她产科医生会一起安排，想问的随时可以问。',
        patient: 1, clinical: 0,
        replies: [{ who: '患者', text: '……嗯。晚点再说吧。谢谢你。' }],
      },
      {
        text: '马上开始讲接下来的处理流程。', patient: -1, clinical: 0,
        replies: [{ who: '旁白', text: '她闭上了眼睛。' }],
      },
      {
        text: '“先别想这个了。”', patient: -1, clinical: 0,
        replies: [{ who: '旁白', text: '她没有再说话。' }],
      },
    ],
  },
  {
    id: 'close',
    prompt: [{ who: '旁白', text: '该说的都说了。' }],
    options: [
      {
        text: '确认她们是否理解，问还有没有想问的。', patient: 1, clinical: 0,
        replies: [{ who: '家属', text: '暂时没有了。谢谢医生。' }],
      },
      { text: '说一句“那就这样”，然后离开。', patient: -1, clinical: 0, replies: [] },
    ],
  },
];

export const REVEAL_LINES: Line[] = [
  { who: '旁白', text: '标本已在治疗前留取。团队按讨论的方案执行。' },
  { who: '师姐', text: 'ADAMTS13 的结果出来了，给你。' },
];

// ---------- 师姐 ----------

/** 汇报时，师姐为尚未收集的问诊信息补充提示；每次记为一次协助 */
export const SENIOR_HINTS: { text: string; items: Item[] }[] = [
  { text: '有没有注意到护士说她今天还在发烧？', items: [DIALOG_ITEMS.fever] },
  { text: '有没有注意到她一直说头疼？', items: [DIALOG_ITEMS.headache] },
  { text: '有没有注意到她以前怀孕的情况？', items: [DIALOG_ITEMS.g3, DIALOG_ITEMS.loss] },
  {
    text: '有没有注意到她以前体检和平时身体的情况？',
    items: [DIALOG_ITEMS.oldCbc, DIALOG_ITEMS.sun, DIALOG_ITEMS.ulcer, DIALOG_ITEMS.hair],
  },
];

export const ALL_DIALOG_ITEM_IDS = [DIALOG_ITEMS.fever.id, DIALOG_ITEMS.headache.id, ...HISTORY_ITEMS];

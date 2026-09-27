import { CARD_POOL } from '../cards';
import {
  ALL_DIALOG_ITEM_IDS, CRASH_CORRECTION, HINTS, OPENING, OPENING_SUGGESTED, REVEAL_LINES, SENIOR_HINTS, TALK_NODES, TOPICS,
} from '../ch5';
import { DIALOG_ITEMS as D, E24_ITEMS, REPORTS } from '../items';
import { opened, workstation } from './common';
import type { ChapterDef } from './types';

// 第五章：退潮（设计稿第 9 节、附录 E）。判定规则写在 engine/grade.ts 与 engine/feedback.ts。

const REQUIRED = ['R-chem', 'R-cbc', 'R-urine', 'R-hemo'];

export const C5: ChapterDef = {
  id: 'c5',
  no: '第五章',
  title: '退潮',
  scenes: {
    workstation: workstation('去 ICU', 'icu'),
    icu: {
      name: 'ICU 床旁', art: 'scene-icu', width: 640, spawn: 80,
      hotspots: [
        { id: 'door', kind: 'door', label: '回工作站', x: 28, to: 'workstation' },
        { id: 'patient', kind: 'person', label: '患者', x: 240, art: 'sprite-patient', who: '患者' },
        { id: 'nurse', kind: 'person', label: '护士', x: 440, art: 'sprite-nurse', who: '护士' },
      ],
    },
  },
  startScene: 'workstation',
  topics: TOPICS,
  opening: (s) => (s.flags.suspectTma ? OPENING_SUGGESTED : OPENING),
  exitLabel: '“查房了，我们走吧。”',
  blockers: (s) =>
    REQUIRED.every((r) => opened(s, r)) ? null : [{ who: '师姐', text: '引流后还有新结果没看完吧？都在 HIS 上。' }],
  optionalItems: ALL_DIALOG_ITEM_IDS,
  goLines: [{ who: '师姐', text: '走，查房。到时候你跟主任讲。' }],
  questions: [
    {
      id: 'Q5.1', title: '病情有何变化？', categories: ['趋势', '整体判断'],
      hints: HINTS['Q5.1'], insufficient: '病情变化的论证尚不充分。',
    },
    {
      id: 'Q5.2', title: '目前诊断是什么？', categories: ['机制', '诊断'],
      hints: HINTS['Q5.2'], insufficient: '目前诊断的依据尚不充分。',
    },
    {
      id: 'Q5.3', title: '处置原则是什么？', categories: ['检查动作', '救治动作'], timing: true,
      hints: HINTS['Q5.3'], insufficient: '处置原则的论证需要修改。',
    },
  ],
  cards: CARD_POOL,
  seniorHints: SENIOR_HINTS,
  afterReport: {
    lines: [
      { who: '刘主任', text: '好。这个判断站得住。' },
      { who: '刘主任', text: '我这就召集血液科、产科、ICU 和消化科会诊。方案由你来讲。' },
    ],
    next: 'mdt',
  },
  talk: {
    title: '病房谈话',
    nodes: TALK_NODES,
    finish: () => ({ lines: REVEAL_LINES, next: 'reveal', collect: E24_ITEMS.map((i) => i.id) }),
  },
  reveal: {
    title: '原病例回报',
    items: E24_ITEMS,
    note: '这份结果在救治启动之后才回来。高度怀疑时先取样、救治不等结果，这是本章想让你体会的原则。',
    next: 'chapterEnd',
  },
  crashCorrection: CRASH_CORRECTION,
  emergencyGroups: ['E21', 'E23'],
  core: [
    ...REPORTS.filter((r) => r.chapter === 'c5').flatMap((r) => r.items.map((i) => i.id)),
    D.fever.id, D.headache.id, ...E24_ITEMS.map((i) => i.id),
  ],
  ideal: { clinical: 9, patient: 7 },
  endLine: '救治已经启动。可是，这位年轻的患者为什么会走到这一步？',
};

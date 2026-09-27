import { DIALOG_ITEMS as D, itemsOf } from '../items';
import { asked, opened } from './common';
import type { ChapterDef } from './types';

// 序章：接诊（设计稿第 4 节）。无汇报题，熟悉走动、对话点取和 HIS。

export const P0: ChapterDef = {
  id: 'p0',
  no: '序章',
  title: '接诊',
  scenes: {
    er: {
      name: '急诊抢救区', art: 'scene-er', width: 640, spawn: 580,
      hotspots: [
        { id: 'his', kind: 'his', label: '外院资料', x: 100 },
        { id: 'patient', kind: 'person', label: '患者', x: 260, art: 'sprite-patient', who: '患者' },
        { id: 'senior', kind: 'senior', label: '师姐', x: 470, art: 'sprite-senior', who: '师姐' },
      ],
    },
  },
  startScene: 'er',
  topics: [
    {
      id: 'handover', person: 'senior', label: '听交班',
      lines: [
        { who: '师姐', text: '外院转来的。', item: D.age },
        { who: '师姐', text: '三天前开始低热、发黄。', item: D.onset },
        { who: '师姐', text: '昨天起牙龈有点出血，还说肚子胀、没力气、头疼。', item: D.recent },
        { who: '师姐', text: '外院的化验单在资料袋里，你先看一眼。' },
        { who: '旁白', text: '黄底的句子含有病例信息，点一下就能收入右侧的信息板。' },
      ],
    },
    {
      id: 'pt-hello', person: 'patient', label: '打个招呼',
      lines: [
        { who: '你', text: '你好，我是负责你的实习医生。' },
        { who: '患者', text: '医生……我好难受。' },
        { who: '师姐', text: '（在身后）先把资料看了，一会儿我们一起去床旁。' },
      ],
    },
  ],
  opening: () => [
    { who: '师姐', text: '来得正好。有个外院转来的病人，路上情况有变化，家属在旁边。当前的评估要重新做。' },
  ],
  exitLabel: '“资料看完了，去床旁吧。”',
  blockers: (s) => {
    if (!asked(s, 'handover')) return [{ who: '师姐', text: '交班还没听呢。' }];
    if (!opened(s, 'R-E02')) return [{ who: '师姐', text: '外院的化验单先看一眼，在资料袋里。' }];
    return null;
  },
  goLines: [{ who: '师姐', text: '走，去床旁。' }],
  questions: [],
  cards: [],
  seniorHints: [],
  afterReport: { lines: [], next: 'chapterEnd' },
  core: [...itemsOf('E01', 'E02')],
  ideal: { clinical: 0, patient: 0 },
  endLine: '资料入口都认识了。接下来，去床旁。',
};

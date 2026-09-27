import { DIALOG_ITEMS as D } from '../items';
import type { Line, SceneDef, Topic } from '../story';
import type { GameState } from '../../state';

/** 白名单既往史（设计稿 3.5）：各章都可以问到，已问到的再问即核实 */
export const historyTopics = (person: string): Topic[] => [
  {
    id: 'pt-pregnancy', person, label: '了解以前怀孕的情况',
    lines: [
      { who: '你', text: '如果你愿意的话，想了解一下以前怀孕的情况，这对判断病情有帮助。' },
      { who: '旁白', text: '她沉默了一会儿。' },
      { who: '患者', text: '这是第三次怀孕了。', item: D.g3 },
      { who: '患者', text: '前两次，都是七八周的时候没保住。', item: D.loss },
    ],
  },
  {
    id: 'pt-history', person, label: '问以前体检和平时身体',
    lines: [
      { who: '你', text: '以前体检有没有查出过什么问题？平时身体有没有什么反复出现的情况？' },
      { who: '患者', text: '两年前体检说血小板有点低，还有点贫血，没当回事。', item: D.oldCbc },
      { who: '患者', text: '晒了太阳脸上会起红疹，痒。', item: D.sun },
      { who: '患者', text: '嘴里老长溃疡。', item: D.ulcer },
      { who: '患者', text: '头发也掉得多。', item: D.hair },
    ],
  },
  {
    id: 'pt-drug', person, label: '问用药、饮酒、瘙痒和大小便颜色',
    lines: [
      { who: '你', text: '最近有没有吃过什么药、喝过酒？皮肤痒不痒？大小便是什么颜色？' },
      { who: '旁白', text: '本病例材料未提供可确认的回答。这不代表“没有”，只是资料里没有记录。' },
    ],
  },
];

/** 医生工作站：第二、四、五、六章共用同一张场景图，门在最右侧 */
export const workstation = (doorLabel: string, to: string): SceneDef => ({
  name: '医生工作站', art: 'scene-workstation', width: 640, spawn: 200,
  hotspots: [
    { id: 'his', kind: 'his', label: 'HIS 电脑', x: 110 },
    { id: 'senior', kind: 'senior', label: '师姐', x: 330, art: 'sprite-senior', who: '师姐' },
    { id: 'door', kind: 'door', label: doorLabel, x: 612, to },
  ],
});

export const HISTORY_ITEMS = [D.g3, D.loss, D.oldCbc, D.sun, D.ulcer, D.hair].map((i) => i.id);

export const asked = (s: GameState, topic: string) => (s.askCount[topic] ?? 0) > 0;
export const opened = (s: GameState, report: string) => s.openedReports.includes(report);

/** 把缺项汇成一句师姐的话；只说任务类别，不说结果 */
export function missingLine(missing: string[]): Line[] | null {
  if (missing.length === 0) return null;
  return [{ who: '师姐', text: `先别急，还缺：${missing.join('、')}。` }];
}

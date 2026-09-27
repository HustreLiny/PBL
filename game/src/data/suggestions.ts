import type { ChapterId, LedgerEntry } from '../types';
import { CHAPTER_ORDER } from '../types';
import type { Line } from './story';
import type { GameState } from '../state';

// 检查建议（设计稿 3.5、3.6）：建议只创建记录，不等于已经执行，更不提前给出结果。
// 超出病例资料的方向，优先用游戏世界内的理由拉回（叙事引导，3.8）。

export const SUGGESTIONS: { id: string; label: string }[] = [
  { id: 'fetal', label: '评估胎儿情况' },
  { id: 'neuro', label: '持续复评神经系统情况' },
  { id: 'labs', label: '急查血常规、生化、凝血' },
  { id: 'us', label: '腹部超声看胆道' },
  { id: 'mrcp', label: 'MRCP 看胆道' },
  { id: 'ct', label: '腹部 CT' },
  { id: 'smear', label: '外周血涂片和网织红' },
  { id: 'adamts', label: 'ADAMTS13 检测' },
  { id: 'auto', label: '自身抗体筛查' },
];

export interface SuggestReply {
  lines: Line[];
  ledger?: LedgerEntry;
  flag?: string;
}

const idx = (c: ChapterId) => CHAPTER_ORDER.indexOf(c);
const has = (s: GameState, group: string) => s.collected.some((id) => id.startsWith(`${group}.`));
const say = (text: string): SuggestReply => ({ lines: [{ who: '师姐', text }] });

export function replyTo(id: string, s: GameState): SuggestReply {
  const c = idx(s.chapter);
  const before = (ch: ChapterId) => c < idx(ch);
  const again = s.suggestions.includes(id);
  switch (id) {
    case 'fetal':
      if (before('c4')) return say('好，记下了，我联系产科评估。结果出来之前，谁也不能替它下结论。');
      return say('产科一直在跟，超声的结果在 HIS 上。');
    case 'neuro':
      return say('好，记上。意识和头痛的变化要持续观察，有变化随时叫我。');
    case 'labs':
      if (before('c2')) return say('急诊的血已经抽了，结果出来会在 HIS 上。');
      return say('结果都在 HIS 上了。');
    case 'us':
      if (before('c2')) return say('想看有没有胆道梗阻？这个目的对，先记下。');
      return say('本病例没有腹部超声的结果。看胆道的话，MRCP 的报告在 HIS 上，能回答同一个问题。');
    case 'mrcp':
      if (before('c2')) return say('孕期没有辐射，好。等急诊这边的资料出来一起看。');
      return say('MRCP 的报告在 HIS 上。');
    case 'ct':
      return {
        lines: [
          { who: '家属', text: '怀着孕还做 CT？辐射怎么办？' },
          { who: '师姐', text: '（小声）孕期先考虑没有辐射的检查，比如 MRCP。' },
        ],
        ledger: again ? undefined : { kind: '沟通', clinical: 0, patient: -1, note: '给孕妇提出 CT，家属担心辐射' },
      };
    case 'smear':
      if (before('c2')) return say('依据是什么？先记下来，看看后面的化验。');
      if (before('c5')) {
        if (!has(s, 'E08')) return say('先把血常规看了再说。');
        return {
          lines: [{ who: '师姐', text: '血小板和贫血都摆在那儿，这个方向有依据。我记下，结果要等后面。' }],
          ledger: again ? undefined : { kind: '提前识别', clinical: 1, patient: 0, note: '有依据地提前建议涂片和网织红' },
        };
      }
      return say('网织红和涂片的结果在 HIS 上。');
    case 'adamts':
      if (before('c2')) return say('现在就想到这个，依据还不够。先记下。');
      if (before('c5')) {
        if (!has(s, 'E08')) return say('先把血常规看了再说。');
        return {
          lines: [{ who: '师姐', text: '有依据。我记下，这个结果回来得慢，后面再看。' }],
          ledger: s.flags.suspectTma ? undefined : { kind: '提前识别', clinical: 2, patient: 0, note: '有依据地提前建议 ADAMTS13 检测' },
          flag: 'suspectTma',
        };
      }
      if (before('c6')) return say('想到了就去跟主任说。标本要在治疗前留。');
      return say('结果已经回来了。');
    case 'auto':
      if (!before('c6')) return say('结果在 HIS 上。');
      if (!has(s, 'E26')) return say('依据是什么？先记下来。');
      return {
        lines: [{ who: '师姐', text: '日晒红斑、口腔溃疡、旧的血小板低……这条背景线值得保留。我记下，后面安排。' }],
        ledger: again ? undefined : { kind: '提前识别', clinical: 1, patient: 0, note: '有依据地提前建议自身抗体筛查' },
      };
  }
  return say('好，记下了。');
}

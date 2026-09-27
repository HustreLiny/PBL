import { useEffect } from 'react';
import { useGame } from '../ctx';

const ROWS: [string, string][] = [
  ['走动', '← → 或 A、D 键左右走动；也可以直接点击地面。'],
  ['交互', '走到人物或物件旁边，按回车、空格或 E 键。直接点击人物或物件，小人会自己走过去。'],
  ['对话', '点击空白处或按回车继续。黄底的句子含有病例信息，点一下就收入信息板。'],
  ['检查结果', '在 HIS 电脑上查看。数值打了马赛克，点一下才会显示，并收入信息板。'],
  ['资料', '右侧是信息板、笔记和知识库。信息板上的每一条都可以写笔记。'],
  ['汇报', '准备好了就去找师姐，她会带你去见刘主任。'],
];

/** 操作说明：开始游戏时弹出，之后可从顶栏再打开 */
export function Help() {
  const { s, d } = useGame();
  const close = () => d({ t: 'help', on: false });

  useEffect(() => {
    if (!s.help) return;
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'Escape'].includes(e.key)) {
        e.preventDefault();
        d({ t: 'help', on: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.help, d]);

  if (!s.help) return null;
  return (
    <div className="modal-layer" onClick={close}>
      <div className="modal help pixel-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="pixel">操作说明</h2>
        <dl>
          {ROWS.map(([k, v]) => (
            <div key={k} className="help-row">
              <dt className="pixel">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="hint-text">之后随时可以点右上角的“操作说明”再看一遍。</p>
        <button className="primary" onClick={close}>
          知道了
        </button>
      </div>
    </div>
  );
}

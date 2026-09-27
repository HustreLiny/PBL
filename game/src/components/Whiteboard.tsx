import { useGame } from '../ctx';
import { BOARD_FINDINGS, BOARD_HYPS } from '../data/chapters/c3';
import { ALL_ITEMS } from '../data/items';

// 第三章假设白板：候选解释 × 待解释的证据。只是草稿，不参与判定。

export function Whiteboard({ onClose }: { onClose: () => void }) {
  const { s, d } = useGame();
  const { hyps, marks } = s.board;
  const findings = BOARD_FINDINGS.filter((id) => s.collected.includes(id));
  return (
    <div className="whiteboard">
      <div className="row between">
        <h2 className="pixel">会诊白板</h2>
        <button onClick={onClose}>离开白板</button>
      </div>
      <p className="hint-text">先选两个以上的候选解释，再点格子标记：能解释 → 解释不了 → 说不准 → 空白。白板只是草稿，不打分。</p>
      <div className="tags">
        {BOARD_HYPS.map((h) => (
          <button key={h} className={hyps.includes(h) ? 'chip on' : 'chip'} onClick={() => d({ t: 'boardHyp', hyp: h })}>
            {hyps.includes(h) ? '✓ ' : '＋ '}
            {h}
          </button>
        ))}
      </div>
      {hyps.length > 0 && (
        <table className="board-grid">
          <thead>
            <tr>
              <th>证据</th>
              {hyps.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {findings.map((id) => (
              <tr key={id}>
                <td>
                  {ALL_ITEMS[id].name}：{ALL_ITEMS[id].value}
                </td>
                {hyps.map((h) => {
                  const cell = `${h}|${id}`;
                  const m = marks[cell];
                  return (
                    <td key={cell}>
                      <button className={`mark ${m ? `mark-${m}` : ''}`} onClick={() => d({ t: 'boardMark', cell })}>
                        {m ?? '·'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

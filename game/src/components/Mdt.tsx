import { useState } from 'react';
import { useGame } from '../ctx';
import { CARD_POOL, MDT_EXTRA } from '../data/cards';
import { COLUMNS, MDT_ROUNDS, ORDER_CARDS, type Column } from '../data/ch5';
import type { Line } from '../data/story';
import { ALL_ITEMS, itemLabel } from '../data/items';
import { judgeMdt, judgeOrder } from '../engine/grade';
import { Art } from './Art';

const MAX_PLAY = 3;

function OrderBoard() {
  const { d } = useGame();
  const [order, setOrder] = useState<Record<string, Column>>({});
  const done = ORDER_CARDS.every((c) => order[c]);
  const finish = () => {
    const v = judgeOrder(order);
    const verdict = v.crash
      ? '置换不能等到结果回来。先留标本，今天就开始，方案我来调整。'
      : v.samplingLate
        ? '标本要在置换之前留，不然结果就不准了。其他的按你排的来。'
        : '好，就这么定。';
    const lines: Line[] = [
      { who: '刘主任', text: verdict },
      { who: '刘主任', text: '去和患者、家属谈一下吧。' },
    ];
    d({ t: 'order', order, crash: v.crash, perfect: v.matches === ORDER_CARDS.length, lines });
  };
  return (
    <div>
      <h3 className="pixel">刘主任：“把行动排一下。”</h3>
      <p className="hint-text">为每张行动卡选择一列。</p>
      <table className="order">
        <thead>
          <tr>
            <th>行动</th>
            {COLUMNS.map((c) => (
              <th key={c.id}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ORDER_CARDS.map((card) => (
            <tr key={card}>
              <td>{card}</td>
              {COLUMNS.map((c) => (
                <td key={c.id}>
                  <button
                    className={order[card] === c.id ? 'slot on' : 'slot'}
                    onClick={() => setOrder({ ...order, [card]: c.id })}
                    aria-label={`${card}：${c.label}`}
                  >
                    {order[card] === c.id ? '■' : '□'}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button className="primary" disabled={!done} onClick={finish}>
        确定方案
      </button>
    </div>
  );
}

export function Mdt() {
  const { s, d } = useGame();
  const [played, setPlayed] = useState<string[]>([]);
  const [cat, setCat] = useState('证据');
  const round = MDT_ROUNDS[s.mdtRound];

  if (!round) return <OrderBoard />;

  const hand: Record<string, string[]> = {
    证据: s.collected,
    ...Object.fromEntries(CARD_POOL.map((g) => [g.category, g.cards])),
    时序与判断: MDT_EXTRA,
  };
  const toggle = (c: string) =>
    setPlayed(played.includes(c) ? played.filter((x) => x !== c) : played.length < MAX_PLAY ? [...played, c] : played);
  const label = (c: string) => (c in ALL_ITEMS ? itemLabel(c) : c);

  const play = () => {
    const result = judgeMdt(round.id, played);
    d({ t: 'mdtRound', result, lines: round.replies[result] });
    setPlayed([]);
  };

  return (
    <div className="mdt">
      <h2 className="pixel">
        多学科会诊 · 第 {s.mdtRound + 1}/{MDT_ROUNDS.length} 轮
      </h2>
      <div className="mdt-challenge">
        <Art slot={round.art} label={round.who} kind="portrait" />
        <div className="bubble pixel-border-thin">
          <div className="speaker pixel">{round.who}</div>
          <p>{round.challenge}</p>
        </div>
      </div>
      <p className="hint-text">最多打出 {MAX_PLAY} 张卡回应。</p>
      <div className="tags">
        {Object.keys(hand).map((k) => (
          <button key={k} className={cat === k ? 'chip on' : 'chip'} onClick={() => setCat(k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="pick-list">
        {hand[cat].map((c) => (
          <button key={c} className={played.includes(c) ? 'card on' : 'card'} onClick={() => toggle(c)}>
            {label(c)}
          </button>
        ))}
      </div>
      <div className="played">
        已选：{played.length ? played.map(label).join('、') : '（无）'}
      </div>
      <button className="primary" disabled={played.length === 0} onClick={play}>
        出牌
      </button>
    </div>
  );
}

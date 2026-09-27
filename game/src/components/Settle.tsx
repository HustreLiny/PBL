import { useGame } from '../ctx';
import { CHAPTERS, chapterIndex, nextChapter } from '../data/chapters';
import { E32_ITEMS } from '../data/items';
import { clinicalTier, patientTier, type Tier } from '../engine/grade';
import { sumLedger } from '../state';
import { CHAPTER_ORDER } from '../types';

export function Reveal() {
  const { s, d } = useGame();
  const r = CHAPTERS[s.chapter].reveal;
  if (!r) return null;
  return (
    <div className="reveal">
      <h2 className="pixel">{r.title}</h2>
      <table className="report-sheet">
        <tbody>
          {r.items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint-text">已收入信息板。</p>
      <p className="hint-text">{r.note}</p>
      <button className="primary" onClick={() => d({ t: 'phase', phase: r.next })}>
        {r.next === 'ending' ? '查看结局' : '继续'}
      </button>
    </div>
  );
}

/** 章末：过程中不显示分数，只做章节过渡 */
export function ChapterEnd() {
  const { s, d } = useGame();
  const ch = CHAPTERS[s.chapter];
  const next = nextChapter(s.chapter);
  return (
    <div className="chapter-end">
      <h2 className="pixel">
        {ch.no} · {ch.title} · 完
      </h2>
      {ch.endLine && <p>{ch.endLine}</p>}
      {next ? (
        <button className="primary big" onClick={() => d({ t: 'nextChapter' })}>
          进入{CHAPTERS[next].no}
        </button>
      ) : (
        <button className="primary big" onClick={() => d({ t: 'phase', phase: 'ending' })}>
          查看结局
        </button>
      )}
    </div>
  );
}

const LIU_COMMENT: Record<Tier, string> = {
  好: '判断及时，依据扎实。这种病人交给你，我放心。',
  中: '方向是对的，有几处还要再快一点、再稳一点。',
  坏: '你还需要再跟几轮，回头把思路再理一遍。',
};

const DOWN: Record<Tier, Tier> = { 好: '中', 中: '坏', 坏: '坏' };

function endingText(tier: Tier, transferWarned: boolean) {
  if (tier === '好') return '三个月后她回来拔除支架。复查结束，她和家属专门找到你，认认真真地说了声谢谢。';
  if (tier === '中') return '出院那天，她和家属客气地跟你道了别。';
  return transferWarned
    ? '出院后，家属把后续的随访转去了别的医院。'
    : '出院那天，她们收拾好东西就走了，没有和你告别。';
}

export function Ending() {
  const { s, d } = useGame();
  const played = CHAPTER_ORDER.slice(chapterIndex(s.startChapter), chapterIndex(s.chapter) + 1);
  const ideal = played.reduce(
    (a, c) => ({ clinical: a.clinical + CHAPTERS[c].ideal.clinical, patient: a.patient + CHAPTERS[c].ideal.patient }),
    { clinical: 0, patient: 0 },
  );
  const { clinical, patient } = sumLedger(s.ledger);
  const ct = clinicalTier(clinical, ideal.clinical);
  const pt = patientTier(patient, ideal.patient);
  // 结局是家属对玩家这条线的反应：以患者评价为主，临床评价为“坏”时降一档
  const ending = ct === '坏' ? DOWN[pt] : pt;
  const transferWarned = s.ledger.some((e) => e.kind === '转院警告');
  const crashes = s.ledger.filter((e) => e.kind === '翻车').length;
  const hints = Object.values(s.hints).reduce((a, b) => a + b, 0);
  const attempts = Object.values(s.attempts).reduce((a, b) => a + b, 0);
  return (
    <div className="settle">
      <h2 className="pixel">结局</h2>
      {s.startChapter !== 'p0' && (
        <p className="hint-text">你从{CHAPTERS[s.startChapter].no}开始，评价只统计玩过的章节。档位阈值是临时值。</p>
      )}
      <div className="ending pixel-border-thin">
        <div className="pixel">结局：{ending}</div>
        <p>{endingText(ending, transferWarned)}</p>
      </div>
      <div className="tiers">
        <div className="tier pixel-border-thin">
          <div className="pixel">临床评价：{ct}</div>
          <div>刘主任：“{LIU_COMMENT[ct]}”</div>
          <small>
            分值 {clinical}／参考满分 {ideal.clinical}
          </small>
        </div>
        <div className="tier pixel-border-thin">
          <div className="pixel">患者评价：{pt}</div>
          <small>
            分值 {patient}／参考满分 {ideal.patient}
          </small>
        </div>
      </div>
      <h3 className="pixel">原病例后记</h3>
      <ul>
        {E32_ITEMS.map((i) => (
          <li key={i.id}>{i.value}</li>
        ))}
      </ul>
      <p className="hint-text">后记是原病例的真实经过，不因你的选择而改变。</p>
      <h3 className="pixel">复盘</h3>
      <ul>
        <li>汇报提交次数：{attempts}</li>
        <li>翻车次数：{crashes}</li>
        <li>请教层级合计：{hints}</li>
        <li>提过的检查建议：{s.suggestions.length} 项</li>
      </ul>
      <table className="ledger">
        <thead>
          <tr>
            <th>章节</th>
            <th>事件</th>
            <th>说明</th>
            <th>临床</th>
            <th>患者</th>
          </tr>
        </thead>
        <tbody>
          {s.ledger.map((e, i) => (
            <tr key={i}>
              <td>{e.chapter ? CHAPTERS[e.chapter].no : ''}</td>
              <td>{e.kind}</td>
              <td>{e.note}</td>
              <td>{e.clinical || ''}</td>
              <td>{e.patient || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="primary" onClick={() => d({ t: 'reset' })}>
        回到标题
      </button>
    </div>
  );
}

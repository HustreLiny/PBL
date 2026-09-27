import { useState } from 'react';
import { useGame } from '../ctx';
import { CHAPTERS } from '../data/chapters';
import { feedbackFor } from '../engine/feedback';
import { ALL_ITEMS } from '../data/items';
import { gradeQuestion } from '../engine/grade';
import { newClaim } from '../state';
import { TIMINGS, type Claim, type QuestionId } from '../types';
import { Art } from './Art';

function useCardClass() {
  const { s } = useGame();
  const cls: Record<string, string> = Object.fromEntries(
    CHAPTERS[s.chapter].cards.flatMap((g) => g.cards.map((c) => [c, `cat-${g.color}`])),
  );
  return (card: string) => cls[card] ?? '';
}

function EvidenceSlip({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const it = ALL_ITEMS[id];
  return (
    <div className="slip">
      <span className="slip-name">{it.name}</span>
      <span className="slip-value">{it.value}</span>
      {onRemove && (
        <button className="slip-x" title="移除" onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  );
}

function ClaimCard(props: { q: QuestionId; timing?: boolean; claim: Claim; readOnly?: boolean; marked?: boolean }) {
  const { q, timing, claim, readOnly, marked } = props;
  const { s, d } = useGame();
  const cardClass = useCardClass();
  const selecting = s.selecting?.key === claim.key;
  const list = s.answers[q] ?? [];
  const update = (c: Claim) => d({ t: 'answers', answers: { ...s.answers, [q]: list.map((x) => (x.key === c.key ? c : x)) } });
  const remove = () => {
    if (selecting) d({ t: 'select', target: null });
    d({ t: 'answers', answers: { ...s.answers, [q]: list.filter((x) => x.key !== claim.key) } });
  };
  return (
    <div className={`claim-card ${cardClass(claim.card)} ${selecting ? 'selecting' : ''} ${marked ? 'marked' : ''}`}>
      <div className="claim-face pixel">{claim.card}</div>
      {marked && <div className="mark-badge">上级：这里有问题</div>}
      {timing && (
        <div className="timing">
          {TIMINGS.map((t) => (
            <button
              key={t}
              disabled={readOnly}
              className={claim.timing === t ? 'tchip on' : 'tchip'}
              onClick={() => update({ ...claim, timing: claim.timing === t ? null : t })}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="slips">
        {claim.evidence.map((id) => (
          <EvidenceSlip
            key={id}
            id={id}
            onRemove={readOnly ? undefined : () => update({ ...claim, evidence: claim.evidence.filter((e) => e !== id) })}
          />
        ))}
        {!readOnly && (
          <button
            className={selecting ? 'slip slip-add on' : 'slip slip-add'}
            onClick={() => d({ t: 'select', target: selecting ? null : { q, key: claim.key } })}
          >
            {selecting ? '← 在信息板点击条目；点这里完成' : '＋ 论据'}
          </button>
        )}
      </div>
      {!readOnly && (
        <button className="card-btn danger" onClick={remove}>
          删除
        </button>
      )}
    </div>
  );
}

function CardTray({ q, cats, onClose }: { q: QuestionId; cats: string[]; onClose: () => void }) {
  const { s, d } = useGame();
  const list = s.answers[q] ?? [];
  const used = list.map((c) => c.card);
  return (
    <div className="tray pixel-border-thin">
      <div className="row between">
        <b>选择一张概念卡，作为新论点</b>
        <button className="small" onClick={onClose}>
          收起
        </button>
      </div>
      {CHAPTERS[s.chapter].cards.filter((g) => cats.includes(g.category)).map((g) => (
        <div key={g.category} className="tray-group">
          <div className="tray-cat">{g.category}</div>
          <div className="tray-cards">
            {g.cards.map((c) => (
              <button
                key={c}
                className={`concept cat-${g.color}`}
                disabled={used.includes(c)}
                onClick={() => {
                  const claim = newClaim(c);
                  d({ t: 'answers', answers: { ...s.answers, [q]: [...list, claim] } });
                  onClose();
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Report() {
  const { s, d } = useGame();
  const ch = CHAPTERS[s.chapter];
  const QUESTIONS = ch.questions;
  const [tray, setTray] = useState(false);
  const [opinion, setOpinion] = useState<{ q: QuestionId; pass: boolean; text: string; ask: boolean } | null>(() =>
    s.reportStep >= QUESTIONS.length ? { q: QUESTIONS[QUESTIONS.length - 1].id, pass: true, text: '', ask: false } : null,
  );
  const [marked, setMarked] = useState<string[]>([]);
  const step = Math.min(s.reportStep, QUESTIONS.length - 1);
  const q = QUESTIONS[step];
  const claims = s.answers[q.id] ?? [];
  const hintLv = s.hints[q.id] ?? 0;
  const seniorHint = ch.seniorHints.findIndex(
    (h, i) => !s.seniorHintsUsed.includes(i) && h.items.some((it) => !s.collected.includes(it.id)),
  );

  const submit = () => {
    if (claims.length === 0) return;
    const v = gradeQuestion(q.id, claims);
    d({ t: 'submitQ', q: q.id, verdict: v, claims });
    setTray(false);
    const level = (s.attempts[q.id] ?? 0) + 1;
    const pass = v.result === 'pass';
    const fb = pass ? null : feedbackFor(q.id, claims, level);
    setMarked(fb?.keys ?? []);
    setOpinion({ q: q.id, pass, text: fb?.text ?? q.insufficient, ask: !pass && level >= 3 });
    if (v.crash && ch.crashCorrection) d({ t: 'say', lines: [{ who: '刘主任', text: ch.crashCorrection }] });
  };

  const next = () => {
    setOpinion(null);
    if (s.reportStep >= QUESTIONS.length) d({ t: 'reportDone' });
  };

  return (
    <div className="report">
      <div className="row between">
        <h2 className="pixel">{s.chapter === 'c5' ? '查房汇报' : '向刘主任汇报'}</h2>
        <button onClick={() => d({ t: 'phase', phase: 'explore' })}>先回去再看看</button>
      </div>
      <div className="steps">
        {QUESTIONS.map((x, i) => (
          <span key={x.id} className={i < s.reportStep ? 'step done' : i === step ? 'step on' : 'step'}>
            {i < s.reportStep ? '✓' : i + 1}
          </span>
        ))}
      </div>

      {QUESTIONS.slice(0, step).map((x) => (
        <details key={x.id} className="passed">
          <summary>
            ✓ {x.title}
          </summary>
          <div className="claims">
            {(s.answers[x.id] ?? []).map((c) => (
              <ClaimCard key={c.key} q={x.id} timing={x.timing} claim={c} readOnly />
            ))}
          </div>
        </details>
      ))}

      {seniorHint >= 0 && (
        <div className="senior-hint">
          <span>师姐凑过来，好像想提醒你什么。</span>
          <button className="small" onClick={() => d({ t: 'seniorHint', index: seniorHint })}>
            听听
          </button>
        </div>
      )}

      <section className="question">
        <div className="row between">
          <h3 className="pixel">刘主任：“{q.title}”</h3>
          <button className="small" disabled={hintLv >= 3} onClick={() => d({ t: 'hint', q: q.id })}>
            请教{hintLv > 0 ? `（已领 ${hintLv}/3）` : ''}
          </button>
        </div>
        {q.hints.slice(0, hintLv).map((h, i) => (
          <p key={i} className="hint">
            💡 {h}
          </p>
        ))}
        <p className="hint-text">每张概念卡是一个论点，为它挂上信息板里的条目作为论据。</p>
        <div className="claims">
          {claims.map((c) => (
            <ClaimCard key={c.key} q={q.id} timing={q.timing} claim={c} marked={marked.includes(c.key)} />
          ))}
          <button className="claim-card claim-new" onClick={() => setTray(!tray)}>
            ＋ 新论点
          </button>
        </div>
        {tray && <CardTray q={q.id} cats={q.categories} onClose={() => setTray(false)} />}
        <button className="primary big" disabled={claims.length === 0} onClick={submit}>
          交给上级
        </button>
      </section>

      {opinion && (
        <div className="opinion pixel-border">
          <Art slot="portrait-liu" label="刘主任" kind="portrait" />
          <div>
            <div className="pixel opinion-title">上级医师意见</div>
            <p>{opinion.pass ? '这一题可以了。' : opinion.text}</p>
            {opinion.ask && <p className="hint-text">师姐小声说：卡住的话，可以去“请教”。</p>}
            <button className="primary" onClick={opinion.pass ? next : () => setOpinion(null)}>
              {opinion.pass ? (s.reportStep >= QUESTIONS.length ? '汇报完毕' : '下一个问题') : '回去修改'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

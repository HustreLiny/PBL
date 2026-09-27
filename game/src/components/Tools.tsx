import { useState } from 'react';
import { useGame } from '../ctx';
import { ALL_ITEMS } from '../data/items';
import { KNOWLEDGE } from '../data/knowledge';
import type { ItemId } from '../types';

type Tab = 'board' | 'notes' | 'kb';

const TIME_ORDER = ['外院', '急诊', 'ERCP 前', 'ERCP', '引流后', '后续回报', '后续', '随访', '既往'];

function BoardItem({ id }: { id: ItemId }) {
  const { s, d } = useGame();
  const it = ALL_ITEMS[id];
  const [editing, setEditing] = useState(false);
  const note = s.itemNotes[id] ?? '';
  const sel = s.selecting;
  const claim = sel ? s.answers[sel.q].find((c) => c.key === sel.key) : undefined;
  const inClaim = claim?.evidence.includes(id) ?? false;

  const toggle = () => {
    if (!sel || !claim) return;
    const evidence = inClaim ? claim.evidence.filter((e) => e !== id) : [...claim.evidence, id];
    d({
      t: 'answers',
      answers: { ...s.answers, [sel.q]: s.answers[sel.q].map((c) => (c.key === claim.key ? { ...c, evidence } : c)) },
    });
  };

  return (
    <div className={`item ${sel ? 'selectable' : ''} ${inClaim ? 'picked' : ''}`} onClick={toggle}>
      <div className="item-main">
        <span className="item-name">{it.name}</span>
        <span className="item-value">{it.value}</span>
        {sel ? (
          <span className="item-pick">{inClaim ? '✓ 已加入' : '＋ 加入'}</span>
        ) : (
          <button
            className="link"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(!editing);
            }}
          >
            {note ? '笔记 ✎' : '＋笔记'}
          </button>
        )}
      </div>
      {note && !editing && <div className="item-note">✎ {note}</div>}
      {editing && (
        <textarea
          className="item-note-edit"
          autoFocus
          value={note}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => d({ t: 'itemNote', id, text: e.target.value })}
          onBlur={() => setEditing(false)}
          placeholder="记下你的想法……"
        />
      )}
    </div>
  );
}

function Board() {
  const { s, d } = useGame();
  const items = s.collected.map((id) => ALL_ITEMS[id]).filter(Boolean);
  const byTime = TIME_ORDER.map((t) => {
    const inTime = items.filter((i) => i.time === t);
    const groups = [...new Set(inTime.map((i) => i.group))];
    return { t, groups: groups.map((g) => ({ g, ids: inTime.filter((i) => i.group === g).map((i) => i.id) })) };
  }).filter((x) => x.groups.length > 0);
  return (
    <div>
      {s.selecting && (
        <div className="select-banner">
          正在为论点选论据：点击条目加入或移除
          <button className="small" onClick={() => d({ t: 'select', target: null })}>
            完成
          </button>
        </div>
      )}
      {byTime.map((x) => (
        <section key={x.t}>
          <h4 className="pixel">{x.t}</h4>
          {x.groups.map((g) => (
            <div key={g.g} className="item-group">
              <div className="item-group-id">{g.g}</div>
              {g.ids.map((id) => (
                <BoardItem key={id} id={id} />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function Notes() {
  const { s, d } = useGame();
  return (
    <div>
      <p className="hint-text">个人笔记只给你自己看，不参与任何判定。</p>
      <textarea
        className="notes"
        value={s.notes}
        onChange={(e) => d({ t: 'notes', text: e.target.value })}
        placeholder="在这里随手记……"
      />
    </div>
  );
}

function Knowledge() {
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const tags = [...new Set(KNOWLEDGE.flatMap((k) => k.tags))];
  const list = tag ? KNOWLEDGE.filter((k) => k.tags.includes(tag)) : KNOWLEDGE;
  return (
    <div>
      <div className="tags">
        <button className={tag === null ? 'chip on' : 'chip'} onClick={() => setTag(null)}>
          全部
        </button>
        {tags.map((t) => (
          <button key={t} className={tag === t ? 'chip on' : 'chip'} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
      </div>
      {list.map((k) => (
        <div key={k.id} className="kb">
          <button className="kb-title" onClick={() => setOpen(open === k.id ? null : k.id)}>
            {k.id} {k.title}
          </button>
          {open === k.id && (
            <div className="kb-body">
              {k.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {k.ref && <small>参考：{k.ref}（见设计稿附录 B）</small>}
            </div>
          )}
        </div>
      ))}
      <p className="hint-text">知识库内容待带教人员审核。</p>
    </div>
  );
}

export function Tools() {
  const { s } = useGame();
  const [tab, setTab] = useState<Tab>('board');
  const [collapsed, setCollapsed] = useState(false);
  // 选证据时强制显示信息板
  const shown: Tab = s.selecting ? 'board' : tab;
  const tabs: [Tab, string][] = [
    ['board', '信息板'],
    ['notes', '笔记'],
    ['kb', '知识库'],
  ];
  return (
    <aside className={collapsed && !s.selecting ? 'tools collapsed' : 'tools'}>
      <div className="tool-tabs">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            className={shown === t && !collapsed ? 'tab on pixel' : 'tab pixel'}
            onClick={() => {
              setTab(t);
              setCollapsed(false);
            }}
          >
            {label}
          </button>
        ))}
        <button className="tab pixel" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '展开' : '收起'}
        </button>
      </div>
      {(!collapsed || s.selecting) && (
        <div className="tool-body">
          {shown === 'board' && <Board />}
          {shown === 'notes' && <Notes />}
          {shown === 'kb' && <Knowledge />}
        </div>
      )}
    </aside>
  );
}

import { useEffect, useReducer, useState } from 'react';
import { Ctx } from './ctx';
import { loadState, reducer, SAVE_KEY } from './state';
import { CHAPTERS } from './data/chapters';
import { CHAPTER_ORDER, type ChapterId } from './types';
import { DialogBox } from './components/DialogBox';
import { Explore } from './components/Explore';
import { Tools } from './components/Tools';
import { Report } from './components/Report';
import { Mdt } from './components/Mdt';
import { Talk } from './components/Talk';
import { ChapterEnd, Ending, Reveal } from './components/Settle';
import { Help } from './components/Help';
import { About } from './components/About';
import { SmallScreen } from './components/SmallScreen';

/** 审阅入口只在网址带 ?review 时出现，玩家看不到 */
const REVIEW = new URLSearchParams(location.search).has('review');

function Title({ onStart }: { onStart: (chapter: ChapterId, suggested: boolean) => void }) {
  const [chapter, setChapter] = useState<ChapterId>('p0');
  const [suggested, setSuggested] = useState(false);
  const [about, setAbout] = useState(false);
  const late = CHAPTER_ORDER.indexOf(chapter) > CHAPTER_ORDER.indexOf('c2');
  return (
    <div className="title-screen">
      <h1 className="pixel">妊娠黄疸</h1>
      <p>PBL 互动推理 · 中档</p>
      <p className="hint-text">病例资料会随病程逐步开放；你可以提出检查建议，并用当前取得的资料推进判断。</p>
      <button className="primary big" onClick={() => onStart('p0', false)}>
        从头开始
      </button>
      <p>
        <button className="link" onClick={() => setAbout(true)}>
          关于
        </button>
      </p>
      {REVIEW && (
        <details className="review-box" open>
          <summary>审阅用：从某一章开始</summary>
          <p className="hint-text">前面章节的核心资料会直接放进信息板。</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <select value={chapter} onChange={(e) => setChapter(e.target.value as ChapterId)}>
              {CHAPTER_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CHAPTERS[c].no} · {CHAPTERS[c].title}
                </option>
              ))}
            </select>
            <button onClick={() => onStart(chapter, suggested)}>从这一章开始</button>
          </div>
          {late && (
            <label className="review-toggle">
              <input type="checkbox" checked={suggested} onChange={(e) => setSuggested(e.target.checked)} />
              假设第二章已提出 TMA／TTP 怀疑
            </label>
          )}
        </details>
      )}
      {about && <About onClose={() => setAbout(false)} />}
    </div>
  );
}

export default function App() {
  const [s, d] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  }, [s]);

  const withTools = s.phase === 'explore' || s.phase === 'report' || s.phase === 'mdt';
  const ch = CHAPTERS[s.chapter];

  return (
    <Ctx.Provider value={{ s, d }}>
      <div className="app">
        <header className="topbar">
          <span className="pixel">妊娠黄疸 PBL{s.phase !== 'title' && ` · ${ch.no} · ${ch.title}`}</span>
          {s.phase !== 'title' && (
            <span className="row" style={{ marginTop: 0 }}>
              <button className="small" onClick={() => d({ t: 'help', on: true })}>
                操作说明
              </button>
              {s.phase !== 'ending' && (
                <button
                  className="small"
                  onClick={() => {
                    if (confirm('重来本章？本章进度会回到章节开头。')) d({ t: 'restartChapter' });
                  }}
                >
                  重来本章
                </button>
              )}
              <button
                className="small"
                onClick={() => {
                  if (confirm('回到标题？当前存档会清空。')) d({ t: 'reset' });
                }}
              >
                回到标题
              </button>
            </span>
          )}
        </header>
        <main className={withTools ? 'layout with-tools' : 'layout'}>
          <div className="stage">
            <div className={s.phase === 'explore' ? 'stage-scroll explore-mode' : 'stage-scroll'}>
              {s.phase === 'title' && <Title onStart={(chapter, suggested) => d({ t: 'start', chapter, suggested })} />}
              {s.phase === 'explore' && <Explore />}
              {s.phase === 'report' && <Report />}
              {s.phase === 'mdt' && <Mdt />}
              {s.phase === 'talk' && <Talk />}
              {s.phase === 'reveal' && <Reveal />}
              {s.phase === 'chapterEnd' && <ChapterEnd />}
              {s.phase === 'ending' && <Ending />}
            </div>
            <DialogBox />
          </div>
          {withTools && <Tools />}
        </main>
        <Help />
        <SmallScreen />
      </div>
    </Ctx.Provider>
  );
}

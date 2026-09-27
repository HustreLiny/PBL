import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { useGame } from '../ctx';
import { CHAPTERS, chapterIndex } from '../data/chapters';
import { FLOOR, MAX_ASK, VIEW_H, VIEW_W, type Hotspot, type SceneDef } from '../data/story';
import { itemLabel, REPORTS, type Report } from '../data/items';
import { SUGGESTIONS } from '../data/suggestions';
import type { ItemId } from '../types';
import { Whiteboard } from './Whiteboard';

// 横版场景：画面按原始像素（视窗 480×270）布局，再整体放大；镜头跟随玩家横向卷动。

/** 行走速度，原始像素每秒 */
const SPEED = 170;
/** 玩家与人物或物件之间可以交互的空隙 */
const REACH = 14;
const PLAYER: [number, number] = [32, 64];
const EDGE = 16;

/** 人物和物件的尺寸（原始像素）；人物为 4 头身像素小人 */
function sizeOf(h: Hotspot): [number, number] {
  if (h.art) return PLAYER;
  switch (h.kind) {
    case 'door':
      return [36, 92];
    case 'board':
      return [110, 64];
    case 'his':
      return [48, 40];
    default:
      return [36, 30];
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const reachOf = (h: Hotspot) => sizeOf(h)[0] / 2 + PLAYER[0] / 2 + REACH;

function nearestAt(scene: SceneDef, px: number) {
  return scene.hotspots
    .map((h) => ({ h, dist: Math.abs(h.x - px) }))
    .filter((o) => o.dist <= reachOf(o.h))
    .sort((a, b) => a.dist - b.dist)[0]?.h;
}

/** 有美术图就显示图，没有就留占位色块 */
function SpriteImg({ slot }: { slot: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img className="sprite-img pixelated" src={`/art/${slot}.png`} alt="" onError={() => setFailed(true)} />;
}

function SceneBg({ scene }: { scene: SceneDef }) {
  const [failed, setFailed] = useState(false);
  const style = { width: scene.width, height: VIEW_H };
  if (!failed)
    return <img className="scene-bg pixelated" src={`/art/${scene.art}.png`} alt="" style={style} onError={() => setFailed(true)} />;
  return (
    <div className="scene-bg scene-ph" style={style}>
      <small>
        {scene.art}.png · {scene.width}×{VIEW_H}
      </small>
    </div>
  );
}

function His({ onClose }: { onClose: () => void }) {
  const { s, d } = useGame();
  const [open, setOpen] = useState<Report | null>(null);
  const now = chapterIndex(s.chapter);
  // 本章新开放的放前面，其余按病程顺序
  const list = REPORTS.filter((r) => chapterIndex(r.chapter) <= now).sort(
    (a, b) => Number(b.chapter === s.chapter) - Number(a.chapter === s.chapter),
  );
  const pick = (r: Report) => {
    setOpen(r);
    d({ t: 'openReport', id: r.id });
  };
  return (
    <div className="his">
      <div className="row between">
        <h2 className="pixel">{s.chapter === 'p0' ? '外院资料' : 'HIS · 检验与检查'}</h2>
        <button onClick={onClose}>离开</button>
      </div>
      <div className="his-body">
        <ul className="his-list">
          {list.map((r) => (
            <li key={r.id}>
              <button className={open?.id === r.id ? 'his-entry on' : 'his-entry'} onClick={() => pick(r)}>
                <span>{r.title}</span>
                <small>
                  {r.time}
                  {r.chapter === s.chapter && !s.openedReports.includes(r.id) && <b className="new"> 新</b>}
                </small>
              </button>
            </li>
          ))}
        </ul>
        <div className="his-sheet">
          {open ? (
            <>
              <h3>{open.title}</h3>
              <p className="hint-text">点击条目查看结果，查看后自动收入信息板。</p>
              <table>
                <tbody>
                  {open.items.map((it) => {
                    const got = s.collected.includes(it.id);
                    return (
                      <tr key={it.id} className={got ? '' : 'masked-row'} onClick={() => d({ t: 'collect', id: it.id })}>
                        <td>{it.name}</td>
                        <td>{got ? it.value : <span className="mosaic">██████</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <p className="hint-text">从左侧选择一份报告。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Emergency({ onDone }: { onDone: () => void }) {
  const { s, d } = useGame();
  const [picked, setPicked] = useState<ItemId[]>([]);
  const toggle = (id: ItemId) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  return (
    <div className="scene-panel pixel-border-thin">
      <p>
        <b>师姐：</b>什么情况？把依据指给我看。
      </p>
      <div className="pick-list">
        {s.collected.map((id) => (
          <button key={id} className={picked.includes(id) ? 'chip on' : 'chip'} onClick={() => toggle(id)}>
            {itemLabel(id)}
          </button>
        ))}
      </div>
      <div className="row">
        <button onClick={onDone}>算了</button>
        <button
          className="primary"
          onClick={() => {
            d({ t: 'emergency', items: picked });
            onDone();
          }}
        >
          告诉师姐
        </button>
      </div>
    </div>
  );
}

function Suggest({ onDone }: { onDone: () => void }) {
  const { s, d } = useGame();
  return (
    <div className="scene-panel pixel-border-thin">
      <p>
        <b>师姐：</b>想做什么检查、评估？我帮你记下。<span className="hint-text">建议只是记录，不等于已经执行。</span>
      </p>
      <div className="options">
        {SUGGESTIONS.map((x) => (
          <button
            key={x.id}
            className="option"
            onClick={() => {
              d({ t: 'suggest', id: x.id });
              onDone();
            }}
          >
            {x.label}
            {s.suggestions.includes(x.id) && <small>（已提过）</small>}
          </button>
        ))}
        <button className="option" onClick={onDone}>
          算了
        </button>
      </div>
    </div>
  );
}

type Panel = null | { person: string; label: string } | 'senior' | 'emergency' | 'suggest' | 'confirmRound';

export function Explore() {
  const { s, d } = useGame();
  const ch = CHAPTERS[s.chapter];
  const scene = ch.scenes[s.scene] ?? ch.scenes[ch.startScene];
  const [x, setX] = useState(scene.spawn);
  const [facing, setFacing] = useState(1);
  const [walking, setWalking] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [overlay, setOverlay] = useState<null | 'his' | 'board'>(null);
  const [k, setK] = useState(2);
  const view = useRef<HTMLDivElement>(null);
  const xRef = useRef(scene.spawn);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const target = useRef<{ x: number; then?: Hotspot } | null>(null);
  const keys = useRef({ left: false, right: false });
  const prevScene = useRef(s.scene);

  const blocked = overlay !== null || panel !== null || s.dialog.length > 0 || s.help;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  const place = (nx: number) => {
    xRef.current = nx;
    setX(nx);
  };

  // 换场景：从哪扇门进来，就站在对应的门边
  useEffect(() => {
    const from = prevScene.current;
    prevScene.current = s.scene;
    if (from === s.scene) return;
    const door = scene.hotspots.find((h) => h.kind === 'door' && h.to === from);
    const inward = door && door.x < scene.width / 2 ? 44 : -44;
    place(door ? clamp(door.x + inward, EDGE, scene.width - EDGE) : scene.spawn);
    target.current = null;
  }, [s.scene]); // eslint-disable-line react-hooks/exhaustive-deps

  // 画面按容器宽度整体缩放
  useLayoutEffect(() => {
    const el = view.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / VIEW_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, [overlay]);

  const interact = (h: Hotspot) => {
    setPanel(null);
    target.current = null;
    setFacing(h.x >= xRef.current ? 1 : -1);
    if (h.kind === 'door' && h.to) d({ t: 'scene', scene: h.to });
    else if (h.kind === 'his') setOverlay('his');
    else if (h.kind === 'board') setOverlay('board');
    else if (h.kind === 'senior') setPanel('senior');
    else if (h.kind === 'talk') {
      const block = ch.talk?.gate?.(s);
      if (block) d({ t: 'say', lines: block });
      else d({ t: 'phase', phase: 'talk' });
    } else setPanel({ person: h.id, label: h.label });
  };
  const interactRef = useRef(interact);
  interactRef.current = interact;

  // 行走：按住方向键持续移动；点击后走到目标处
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let dir = 0;
      let arrive: Hotspot | undefined;
      if (!blockedRef.current) {
        const { left, right } = keys.current;
        if (left !== right) {
          dir = left ? -1 : 1;
          target.current = null;
        } else if (target.current) {
          const dx = target.current.x - xRef.current;
          if (Math.abs(dx) <= SPEED * dt) {
            place(target.current.x);
            arrive = target.current.then;
            target.current = null;
          } else dir = Math.sign(dx);
        }
      }
      let moved = false;
      if (dir) {
        const nx = clamp(xRef.current + dir * SPEED * dt, EDGE, sceneRef.current.width - EDGE);
        moved = nx !== xRef.current;
        if (moved) place(nx);
        setFacing(dir);
      }
      setWalking(moved);
      if (arrive) interactRef.current(arrive);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
    const isLeft = (key: string) => key === 'ArrowLeft' || key === 'a' || key === 'A';
    const isRight = (key: string) => key === 'ArrowRight' || key === 'd' || key === 'D';
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.key === 'Escape') {
        setPanel(null);
        setOverlay(null);
        return;
      }
      if (blockedRef.current) return;
      if (isLeft(e.key)) {
        keys.current.left = true;
        e.preventDefault();
      } else if (isRight(e.key)) {
        keys.current.right = true;
        e.preventDefault();
      } else if (!e.repeat && ['Enter', ' ', 'e', 'E'].includes(e.key)) {
        const h = nearestAt(sceneRef.current, xRef.current);
        if (h) {
          e.preventDefault();
          interactRef.current(h);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (isLeft(e.key)) keys.current.left = false;
      if (isRight(e.key)) keys.current.right = false;
    };
    const reset = () => {
      keys.current = { left: false, right: false };
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);

  const walkTo = (h: Hotspot) => {
    setPanel(null);
    const px = xRef.current;
    if (Math.abs(h.x - px) <= reachOf(h)) {
      interact(h);
      return;
    }
    // 走到人物或物件旁边；门要走进去
    const gap = h.kind === 'door' ? 0 : sizeOf(h)[0] / 2 + PLAYER[0] / 2 + 4;
    target.current = { x: clamp(h.x + (px < h.x ? -gap : gap), EDGE, scene.width - EDGE), then: h };
  };

  const camX = clamp(x - VIEW_W / 2, 0, Math.max(0, scene.width - VIEW_W));

  const walkToFloor = (e: MouseEvent) => {
    if (blocked || !view.current) return;
    const rect = view.current.getBoundingClientRect();
    const wx = (e.clientX - rect.left) / k + camX;
    target.current = { x: clamp(wx, EDGE, scene.width - EDGE) };
  };

  const goRound = (confirmed: boolean) => {
    const block = ch.blockers(s);
    if (block) {
      setPanel(null);
      d({ t: 'say', lines: block });
      return;
    }
    const missingTalk = (ch.optionalItems ?? []).some((id) => !s.collected.includes(id));
    if (missingTalk && !confirmed) {
      setPanel('confirmRound');
      return;
    }
    setPanel(null);
    d({ t: 'say', lines: ch.goLines, after: ch.questions.length ? 'report' : 'chapterEnd' });
  };

  if (overlay === 'his') return <His onClose={() => setOverlay(null)} />;
  if (overlay === 'board') return <Whiteboard onClose={() => setOverlay(null)} />;

  const seniorTopics = ch.topics.filter((t) => t.person === 'senior');
  const near = blocked ? undefined : nearestAt(scene, x);

  return (
    <div className="explore">
      <div className="viewport" ref={view}>
        <div
          className="native"
          style={{ width: scene.width, height: VIEW_H, transform: `scale(${k}) translateX(${-camX}px)` }}
          onClick={walkToFloor}
        >
          <SceneBg key={scene.art} scene={scene} />
          {scene.hotspots.map((h) => {
            const [w, hh] = sizeOf(h);
            return (
              <button
                key={h.id}
                className={h.art ? 'hs hs-actor' : `hs hs-obj hs-${h.kind}`}
                style={{ left: h.x - w / 2, bottom: VIEW_H - FLOOR + (h.lift ?? 0), width: w, height: hh }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  walkTo(h);
                }}
              >
                {h.art && <SpriteImg slot={h.art} />}
                <span className="hs-label">{h.label}</span>
                {near === h && <span className="hs-prompt">回车</span>}
              </button>
            );
          })}
          <div
            className={walking ? 'actor player walking' : 'actor player'}
            style={{ left: x - PLAYER[0] / 2, bottom: VIEW_H - FLOOR, width: PLAYER[0], height: PLAYER[1] }}
          >
            <div className="actor-body" style={{ transform: `scaleX(${facing})` }}>
              <SpriteImg slot="sprite-player" />
            </div>
            <span className="hs-label">你</span>
          </div>
        </div>
        <div className="scene-name pixel">{scene.name}</div>

        {panel && typeof panel === 'object' && (
          <div className="scene-panel pixel-border-thin">
            <b>{panel.label}</b>
            <div className="options">
              {ch.topics
                .filter((t) => t.person === panel.person)
                .map((t) => {
                  const n = s.askCount[t.id] ?? 0;
                  return (
                    <button key={t.id} className="option" onClick={() => d({ t: 'ask', topic: t.id })}>
                      {t.label}
                      {n > 0 && <small> （已问 {Math.min(n, MAX_ASK)}/{MAX_ASK}）</small>}
                    </button>
                  );
                })}
              <button className="option" onClick={() => setPanel(null)}>
                离开
              </button>
            </div>
          </div>
        )}

        {panel === 'senior' && (
          <div className="scene-panel pixel-border-thin">
            <b>师姐</b>
            <div className="options">
              {seniorTopics.map((t) => (
                <button key={t.id} className="option" onClick={() => d({ t: 'ask', topic: t.id })}>
                  {t.label}
                </button>
              ))}
              {s.chapter !== 'p0' && (
                <>
                  <button className="option" onClick={() => setPanel('emergency')}>
                    “有紧急情况。”
                  </button>
                  <button className="option" onClick={() => setPanel('suggest')}>
                    “我想提个建议。”
                  </button>
                </>
              )}
              <button className="option" onClick={() => goRound(false)}>
                {ch.exitLabel}
              </button>
              <button className="option" onClick={() => setPanel(null)}>
                离开
              </button>
            </div>
          </div>
        )}

        {panel === 'emergency' && <Emergency onDone={() => setPanel(null)} />}
        {panel === 'suggest' && <Suggest onDone={() => setPanel(null)} />}

        {panel === 'confirmRound' && (
          <div className="scene-panel pixel-border-thin">
            <p>
              <b>师姐：</b>都问完了吗？
            </p>
            <div className="options">
              <button className="option" onClick={() => setPanel(null)}>
                “我再去问问。”
              </button>
              <button className="option" onClick={() => goRound(true)}>
                “问完了，走吧。”
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

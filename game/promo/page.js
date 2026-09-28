// 宣传片录制时注入游戏页面，先于游戏脚本运行（record.js 用 addInitScript 加载）。
// 1. 接管 requestAnimationFrame 和 performance.now：录制时逐帧推进时间，画面不受机器快慢影响。
// 2. 在页面最上层画字幕条、按键、光标、高亮，以及片头、片尾等整屏画面。每帧的状态由 record.js 传入。
(() => {
  const nRaf = window.requestAnimationFrame.bind(window);
  const nNow = performance.now.bind(performance);
  let manual = false;
  let offset = 0;
  let clock = 0;
  let seq = 0;
  let queue = new Map();
  const now = () => (manual ? clock : nNow() - offset);
  performance.now = now;
  window.requestAnimationFrame = (cb) => {
    queue.set(++seq, cb);
    return seq;
  };
  window.cancelAnimationFrame = (id) => void queue.delete(id);
  const flush = (ts) => {
    const q = queue;
    queue = new Map();
    for (const cb of q.values()) {
      try {
        cb(ts);
      } catch (e) {
        console.error(e);
      }
    }
  };
  const pump = () => {
    if (!manual) flush(now());
    nRaf(pump);
  };
  nRaf(pump);

  const tick = () =>
    new Promise((r) => {
      const c = new MessageChannel();
      c.port1.onmessage = () => r();
      c.port2.postMessage(0);
    });
  const imageReady = (i) =>
    i.complete
      ? i.decode().catch(() => {})
      : new Promise((r) => {
          i.addEventListener('load', r, { once: true });
          i.addEventListener('error', r, { once: true });
        });
  /** 等 React 渲染、ResizeObserver、字体和图片都就绪，再截这一帧 */
  async function settle() {
    await tick();
    await tick();
    await new Promise((r) => nRaf(() => r()));
    await tick();
    await tick();
    document.body.getBoundingClientRect();
    await document.fonts.ready;
    await Promise.all([...document.images].map(imageReady));
    for (const a of document.getAnimations()) {
      if (a.playState !== 'paused') {
        a.pause();
        a.currentTime = 0;
      }
    }
  }

  // ---------- 画面工具 ----------

  const W = 1280;
  const H = 720;
  /** 整屏画面里一个原始像素占的 CSS 像素：480×270 的场景铺满 1280×720 */
  const S = W / 480;
  const PIXEL = "'Fusion Pixel', 'LXGW WenKai Screen', monospace";
  const KAI = "'LXGW WenKai Screen', 'Fusion Pixel', serif";
  const CREAM = '#f4efe3';
  const GOLD = '#e3b341';
  const NAVY = '#1d2333';
  const INK = '#0b0e16';
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOut = (p) => 1 - (1 - clamp01(p)) ** 3;
  /** 叠加层按 1280×720 排版，再整体缩放到实际视窗宽度 */
  const unit = () => innerWidth / W;
  const snap = (v) => {
    const f = unit() * devicePixelRatio;
    return Math.round(v * f) / f;
  };

  function el(tag, style = {}, text) {
    const e = document.createElement(tag);
    Object.assign(e.style, style);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const abs = (style) => ({ position: 'absolute', ...style });
  const font = (px, family = PIXEL) => ({ fontFamily: family, fontSize: `${px}px`, lineHeight: 1.25 });
  const centered = (top, style = {}) => abs({ left: '0', right: '0', top: `${top}px`, textAlign: 'center', ...style });

  function art(name, style = {}) {
    const i = el('img', abs({ imageRendering: 'pixelated', ...style }));
    i.src = `/art/${name}.png`;
    return i;
  }
  const sceneImg = (name, width) => art(name, { left: '0', top: '0', width: `${width * S}px`, height: `${H}px` });
  /** 场景里的小人，x 为原始像素中心；dir 为 -1 时面朝左 */
  function sprite(name, x, dir = 1) {
    const i = art(name, { top: `${(234 - 96) * S}px`, width: `${48 * S}px`, height: `${96 * S}px` });
    i.dataset.x = String(x);
    i.dataset.dir = String(dir);
    return i;
  }
  function placeSprite(i, x, lift = 0) {
    i.style.transform = `translate(${snap((x - 24) * S)}px, ${snap(-lift * S)}px) scaleX(${i.dataset.dir})`;
  }

  // 像素箭头光标：# 为描边，. 为填充
  const CURSOR = [
    '#', '##', '#.#', '#..#', '#...#', '#....#', '#.....#', '#......#', '#.......#', '#........#',
    '#.........#', '#......#####', '#...#..#', '#..##..#', '#.#  #..#', '##   #..#', '#     #..#', '      #..#', '       ##',
  ];
  function cursorSvg() {
    let rects = '';
    CURSOR.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== ' ') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === '#' ? '#111' : '#fff'}"/>`;
      }),
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 19" width="24" height="38" shape-rendering="crispEdges">${rects}</svg>`;
  }

  // ---------- 整屏画面 ----------

  function ecgValue(tau) {
    let p = (((tau % 0.5) + 0.5) % 0.5) / 0.5;
    if (p > 0.6) p -= 1;
    const g = (c, w, h) => h * Math.exp(-(((p - c) / w) ** 2));
    return g(-0.18, 0.035, 0.15) + g(-0.025, 0.012, -0.18) + g(0, 0.012, 1) + g(0.03, 0.014, -0.35) + g(0.22, 0.05, 0.28);
  }

  const COVERS = {
    cold: {
      build(root, cfg) {
        root.style.background = '#07090f';
        const box = el('div', abs({ left: '232px', top: '132px', width: '860px' }));
        const lines = cfg.lines.map((l) => {
          const d = el('div', { ...font(32), color: l.color ?? CREAM, height: '60px', whiteSpace: 'pre' });
          box.append(d);
          return d;
        });
        const caret = el('span', { display: 'inline-block', width: '16px', height: '32px', background: CREAM, verticalAlign: '-5px', marginLeft: '6px' });
        const vitals = el('div', abs({ left: '216px', top: '430px', ...font(24), color: '#3ddc84', whiteSpace: 'pre' }), cfg.vitals);
        const cv = el('canvas', abs({ left: `${(W - 320 * S) / 2}px`, top: '480px', width: `${320 * S}px`, height: `${48 * S}px`, imageRendering: 'pixelated' }));
        cv.width = 320;
        cv.height = 48;
        root.append(box, vitals, cv);
        return { lines, caret, cv, vitals };
      },
      update(r, t, cfg) {
        let typing = -1;
        cfg.lines.forEach((l, i) => {
          const n = Math.max(0, Math.min(l.text.length, Math.floor((t - l.at) * cfg.speed)));
          r.lines[i].textContent = l.text.slice(0, n);
          if (t >= l.at) typing = i;
        });
        const doneTyping = typing >= 0 && Math.floor((t - cfg.lines[typing].at) * cfg.speed) >= cfg.lines[typing].text.length;
        if (typing >= 0 && (!doneTyping || Math.floor(t * 2) % 2 === 0)) r.lines[typing].append(r.caret);
        r.vitals.style.opacity = String(clamp01((t - 0.2) / 0.3));
        const ctx = r.cv.getContext('2d');
        ctx.clearRect(0, 0, 320, 48);
        const speed = 160;
        const span = 320 / speed;
        const head = (t * speed) % 320;
        let prev = null;
        for (let x = 0; x < 320; x++) {
          let age = (head - x) / speed;
          if (age < 0) age += span;
          const tau = t - age;
          if (age > span - 0.12 || tau < 0.2) {
            prev = null;
            continue;
          }
          const y = Math.round(30 - 20 * ecgValue(tau));
          ctx.fillStyle = `rgba(61, 220, 132, ${1 - (0.65 * age) / span})`;
          const top = prev === null ? y : Math.min(y, prev);
          ctx.fillRect(x, top, 1, Math.abs(y - (prev ?? y)) + 1);
          prev = y;
        }
      },
    },

    title: {
      build(root, cfg) {
        root.style.background = '#000';
        const world = el('div', abs({ left: '0', top: '0' }));
        world.append(sceneImg('scene-er-bed', 720));
        const sprites = cfg.sprites.map(([name, x, dir]) => sprite(name, x, dir));
        world.append(...sprites);
        const shade = el('div', abs({ inset: '0', background: 'linear-gradient(180deg, rgba(10,12,20,.9) 0%, rgba(10,12,20,.6) 38%, rgba(10,12,20,0) 62%)' }));
        const titleRow = el('div', centered(64, { display: 'flex', justifyContent: 'center', gap: '8px' }));
        const chars = [...cfg.title].map((c) => {
          const s = el('span', { ...font(96), color: CREAM, textShadow: `0 6px 0 ${INK}`, display: 'inline-block' }, c);
          titleRow.append(s);
          return s;
        });
        const sub = el('div', centered(198, { ...font(32), color: GOLD, textShadow: `0 4px 0 ${INK}` }), cfg.sub);
        const line = el('div', centered(252, { ...font(24), color: CREAM, textShadow: `0 4px 0 ${INK}` }), cfg.line);
        const flash = el('div', abs({ inset: '0', background: '#fff' }));
        root.append(world, shade, titleRow, sub, line, flash);
        return { world, sprites, chars, sub, line, flash };
      },
      update(r, t, cfg) {
        r.world.style.transform = `translateX(${-snap(60 * easeOut(t / 4) * S)}px)`;
        r.sprites.forEach((s) => placeSprite(s, Number(s.dataset.x)));
        r.chars.forEach((c, i) => {
          const at = cfg.charAt[i];
          const k = easeOut((t - at) / 0.12);
          c.style.opacity = t < at ? '0' : '1';
          c.style.transform = `translateY(${snap(-24 * (1 - k))}px)`;
        });
        r.sub.style.opacity = String(clamp01((t - 1.1) / 0.2));
        r.line.style.opacity = String(clamp01((t - 1.4) / 0.2));
        r.flash.style.opacity = String(0.9 * clamp01(1 - t / 0.25));
      },
    },

    workflow: {
      build(root, cfg) {
        root.style.background = NAVY;
        const kicker = el('div', centered(72, { ...font(24), color: GOLD, letterSpacing: '8px' }), cfg.kicker);
        const head = el('div', centered(116, { ...font(52), color: CREAM, textShadow: `0 5px 0 ${INK}` }), cfg.title);
        const cards = cfg.steps.map((step, i) => {
          const left = 92 + i * 288;
          const card = el('div', abs({
            left: `${left}px`, top: '270px', width: '232px', height: '164px', background: '#fffaf0', color: NAVY,
            border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}`, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
          }));
          card.append(
            el('div', { ...font(24), color: '#3f7f6e' }, `0${i + 1}`),
            el('div', { ...font(36) }, step),
          );
          root.append(card);
          if (i < cfg.steps.length - 1) root.append(el('div', abs({ left: `${left + 246}px`, top: '322px', ...font(48), color: GOLD }), '→'));
          return card;
        });
        const line = el('div', centered(520, { ...font(28), color: '#c9c3b5' }), cfg.line);
        root.append(kicker, head, line);
        return { kicker, head, cards, line };
      },
      update(r, t) {
        r.kicker.style.opacity = String(clamp01(t / 0.2));
        r.head.style.opacity = String(clamp01((t - 0.15) / 0.25));
        r.cards.forEach((card, i) => {
          const k = easeOut((t - 0.45 - i * 0.28) / 0.18);
          card.style.opacity = String(k);
          card.style.transform = `translateY(${snap(20 * (1 - k))}px)`;
        });
        r.line.style.opacity = String(clamp01((t - 1.65) / 0.25));
      },
    },

    mdt: {
      build(root, cfg) {
        root.style.background = NAVY;
        const head = el('div', centered(64, { ...font(48), color: CREAM }), cfg.title);
        const n = cfg.people.length;
        const left = (W - (n * 192 + (n - 1) * 40)) / 2;
        const cards = cfg.people.map(([slot, label], i) => {
          const c = el('div', abs({ left: `${left + i * 232}px`, top: '160px', width: '192px' }));
          c.append(
            art(slot, { position: 'static', display: 'block', width: '192px', height: '256px', outline: `4px solid ${INK}`, boxShadow: '8px 8px 0 rgba(0,0,0,.35)' }),
            el('div', { ...font(24), color: GOLD, textAlign: 'center', marginTop: '16px' }, label),
          );
          return c;
        });
        const tag = el('div', centered(512, { ...font(32), color: CREAM }), cfg.line);
        root.append(head, ...cards, tag);
        return { cards, tag };
      },
      update(r, t) {
        r.cards.forEach((c, i) => {
          const k = easeOut((t - 0.05 - 0.1 * i) / 0.15);
          c.style.opacity = String(k);
          c.style.transform = `translateY(${snap(16 * (1 - k))}px)`;
        });
        r.tag.style.opacity = String(clamp01((t - 0.6) / 0.2));
      },
    },

    montage: {
      build(root, cfg) {
        root.style.background = '#000';
        const imgs = cfg.items.map((it) => {
          const i = sceneImg(it.art, it.width);
          i.style.display = 'none';
          root.append(i);
          return i;
        });
        const band = el('div', abs({ left: '0', right: '0', top: '272px', height: '176px', background: 'rgba(10,12,20,.74)' }));
        const no = el('div', centered(24, { ...font(24), color: GOLD }));
        const title = el('div', centered(64, { ...font(64), color: CREAM, textShadow: `0 6px 0 ${INK}` }));
        band.append(no, title);
        const flash = el('div', abs({ inset: '0', background: '#fff' }));
        root.append(band, flash);
        return { imgs, no, title, flash };
      },
      update(r, t, cfg) {
        let k = 0;
        cfg.items.forEach((it, i) => {
          if (t >= it.at) k = i;
        });
        const it = cfg.items[k];
        const next = cfg.items[k + 1]?.at ?? cfg.dur;
        r.imgs.forEach((img, i) => {
          img.style.display = i === k ? 'block' : 'none';
        });
        const pan = Math.min(it.width - 480, 16 + 24 * ((t - it.at) / (next - it.at)));
        r.imgs[k].style.transform = `translateX(${-snap(Math.max(0, pan) * S)}px)`;
        r.no.textContent = it.no;
        r.title.textContent = it.title;
        r.flash.style.opacity = String(0.35 * clamp01(1 - (t - it.at) / 0.12));
      },
    },

    eval: {
      build(root, cfg) {
        root.style.background = NAVY;
        const rows = cfg.rows.map((row, ri) => {
          const top = 150 + ri * 88;
          root.append(el('div', abs({ left: '232px', top: `${top}px`, ...font(32), color: CREAM }), row.label));
          const blocks = Array.from({ length: 12 }, (_, i) => {
            const b = el('div', abs({ left: `${440 + i * 44}px`, top: `${top}px`, width: '36px', height: '40px', background: '#2c3448', outline: `4px solid ${INK}` }));
            root.append(b);
            return b;
          });
          return { blocks, color: row.color, fill: row.fill, at: row.at };
        });
        root.append(el('div', abs({ left: '232px', top: '346px', ...font(32), color: CREAM }), cfg.endLabel));
        const ends = cfg.ends.map(([text, color], i) => {
          const e = el('div', abs({ left: `${440 + i * 104}px`, top: '330px', width: '80px', height: '80px', background: color, outline: `4px solid ${INK}`, boxShadow: '6px 6px 0 rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...font(48), color: CREAM }), text);
          root.append(e);
          return e;
        });
        const tag = el('div', centered(520, { ...font(32), color: CREAM }), cfg.line);
        root.append(tag);
        return { rows, ends, tag };
      },
      update(r, t, cfg) {
        r.rows.forEach((row) => {
          const n = Math.floor(clamp01((t - row.at) / 1.0) * row.fill + 1e-6);
          row.blocks.forEach((b, i) => {
            b.style.background = i < n ? row.color : '#2c3448';
          });
        });
        r.ends.forEach((e, i) => {
          const k = easeOut((t - cfg.endAt[i]) / 0.15);
          e.style.opacity = String(k);
          e.style.transform = `translateY(${snap(12 * (1 - k))}px)`;
        });
        r.tag.style.opacity = String(clamp01((t - 2.3) / 0.25));
      },
    },

    end: {
      build(root, cfg) {
        root.style.background = '#000';
        const world = el('div', abs({ left: '0', top: '0' }));
        const bg = sceneImg('scene-ward', 640);
        bg.style.filter = 'brightness(.5) saturate(.85)';
        const walkers = cfg.walkers.map(([name, from, to]) => sprite(name, from, to < from ? -1 : 1));
        const standing = (cfg.stand ?? []).map(([name, x, dir]) => sprite(name, x, dir));
        standing.forEach((s) => placeSprite(s, Number(s.dataset.x)));
        world.append(bg, ...standing, ...walkers);
        const shade = el('div', abs({ inset: '0', background: 'linear-gradient(180deg, rgba(10,12,20,.82) 0%, rgba(10,12,20,.5) 45%, rgba(10,12,20,0) 70%)' }));
        const parts = [
          el('div', centered(72, { ...font(80), color: CREAM, textShadow: `0 6px 0 ${INK}` }), cfg.title),
          el('div', centered(178, { ...font(32), color: GOLD, textShadow: `0 4px 0 ${INK}` }), cfg.sub),
          el('div', centered(236, { ...font(24), color: CREAM, textShadow: `0 4px 0 ${INK}` }), cfg.info),
        ];
        if (cfg.url) parts.push(el('div', centered(286, { ...font(32), color: GOLD, textShadow: `0 4px 0 ${INK}` }), cfg.url));
        const small = el('div', centered(672, { ...font(16, KAI), color: '#c9c3b5', textShadow: `0 2px 0 ${INK}` }), cfg.small);
        const fade = el('div', abs({ inset: '0', background: '#000' }));
        root.append(world, shade, ...parts, small, fade);
        return { world, walkers, parts, small, fade };
      },
      update(r, t, cfg) {
        r.world.style.transform = `translateX(${-snap(40 * (t / cfg.dur) * S)}px)`;
        r.walkers.forEach((w, i) => {
          const [, from, to] = cfg.walkers[i];
          const p = clamp01((t - 0.3) / 2.5);
          const x = from + (to - from) * easeOut(p);
          const moving = p > 0 && p < 0.98;
          placeSprite(w, x, moving && Math.floor(t / 0.15) % 2 === 1 ? 2 : 0);
        });
        r.parts.forEach((p, i) => {
          p.style.opacity = String(clamp01((t - 0.3 - 0.3 * i) / 0.3));
        });
        r.small.style.opacity = String(clamp01((t - 1.5) / 0.3));
        r.fade.style.opacity = String(clamp01((t - (cfg.dur - 1.2)) / 1.2));
      },
    },
  };

  // ---------- 叠加层 ----------

  let ui = null;
  let coverState = null;
  let capText = null;
  let scrollPlan = null;

  function makeUi() {
    const root = el('div', {
      position: 'fixed', left: '0', top: '0', width: `${W}px`, height: `${H}px`, zIndex: '2147483647', pointerEvents: 'none', overflow: 'hidden',
      transformOrigin: '0 0', transform: `scale(${unit()})`,
    });
    const band = el('div', abs({ left: '0', right: '0', bottom: '0', height: '88px', background: NAVY, display: 'none', alignItems: 'center', padding: '0 32px', gap: '16px' }));
    const cap = el('div', { display: 'flex', alignItems: 'center', gap: '16px', ...font(32), color: CREAM, whiteSpace: 'nowrap' });
    cap.append(el('span', { width: '16px', height: '16px', background: GOLD, flex: 'none' }), el('span'));
    const keys = el('div', { marginLeft: 'auto', display: 'flex', gap: '16px' });
    band.append(cap, keys);
    const hl = el('div', abs({ display: 'none', outline: `4px solid ${GOLD}`, boxShadow: '0 0 0 8px rgba(227,179,65,.3)' }));
    const ripple = el('div', abs({ display: 'none', border: `4px solid ${GOLD}`, boxSizing: 'border-box' }));
    const cursor = el('div', abs({ left: '0', top: '0', width: '24px', height: '38px', transformOrigin: '0 0', display: 'none' }));
    cursor.innerHTML = cursorSvg();
    const cover = el('div', abs({ inset: '0', display: 'none', overflow: 'hidden' }));
    const fade = el('div', abs({ inset: '0', background: '#000', opacity: '0' }));
    root.append(band, hl, ripple, cursor, cover, fade);
    document.body.append(root);
    return { root, band, cap, keys, keyEls: {}, hl, ripple, cursor, cover, fade };
  }

  function keycap(label) {
    return el('div', { minWidth: '56px', height: '48px', padding: '0 12px', boxSizing: 'border-box', background: CREAM, color: NAVY, ...font(24), lineHeight: '40px', textAlign: 'center', border: `4px solid ${INK}`, boxShadow: `0 4px 0 ${INK}` }, label);
  }

  function draw(s) {
    ui ??= makeUi();
    const t = s.now;
    // 整屏画面
    if (s.cover) {
      if (coverState?.kind !== s.cover.kind) {
        ui.cover.replaceChildren();
        ui.cover.style.background = '';
        const cfg = window.__promoConfig[s.cover.kind];
        coverState = { kind: s.cover.kind, cfg, refs: COVERS[s.cover.kind].build(ui.cover, cfg) };
      }
      ui.cover.style.display = 'block';
      COVERS[s.cover.kind].update(coverState.refs, s.cover.t, coverState.cfg);
    } else ui.cover.style.display = 'none';

    // 字幕条和按键
    ui.band.style.display = s.band ? 'flex' : 'none';
    const [, capSpan] = ui.cap.children;
    if (s.cap) {
      if (capText !== s.cap.text) {
        capText = s.cap.text;
        capSpan.textContent = s.cap.text;
      }
      const age = t - s.cap.t0;
      ui.cap.style.opacity = String(clamp01(age / 0.2));
      ui.cap.style.transform = `translateY(${snap(12 * (1 - easeOut(age / 0.25)))}px)`;
    } else ui.cap.style.opacity = '0';
    for (const k of s.keyList ?? []) {
      if (!ui.keyEls[k]) {
        ui.keyEls[k] = keycap(k);
        ui.keys.append(ui.keyEls[k]);
      }
    }
    for (const [k, e] of Object.entries(ui.keyEls)) {
      const on = s.keys?.[k];
      const down = on === true || (typeof on === 'number' && t - on < 0.15);
      e.style.display = (s.keyList ?? []).includes(k) ? 'block' : 'none';
      e.style.background = down ? GOLD : CREAM;
      e.style.transform = down ? 'translateY(4px)' : 'none';
      e.style.boxShadow = down ? 'none' : `0 4px 0 ${INK}`;
    }

    // 高亮框
    if (s.hl) {
      const age = t - s.hl.t0;
      const grow = 1 + 0.15 * (1 - easeOut(age / 0.2));
      const pad = 6;
      Object.assign(ui.hl.style, {
        display: 'block',
        left: `${snap(s.hl.x - pad)}px`, top: `${snap(s.hl.y - pad)}px`,
        width: `${snap(s.hl.w + pad * 2)}px`, height: `${snap(s.hl.h + pad * 2)}px`,
        transform: `scale(${grow})`,
        opacity: String(clamp01(age / 0.12) * (0.7 + 0.3 * Math.cos(age * Math.PI * 4))),
      });
    } else ui.hl.style.display = 'none';

    // 光标与点击波纹
    if (s.cur && s.cur.a > 0) {
      const pressed = s.cur.p0 !== null && t - s.cur.p0 < 0.12;
      ui.cursor.style.display = 'block';
      ui.cursor.style.opacity = String(s.cur.a);
      ui.cursor.style.transform = `translate(${snap(s.cur.x)}px, ${snap(s.cur.y)}px) scale(${pressed ? 0.85 : 1})`;
      const age = s.cur.p0 === null ? 1 : t - s.cur.p0;
      if (age < 0.3) {
        const size = 12 + 36 * easeOut(age / 0.3);
        Object.assign(ui.ripple.style, {
          display: 'block', opacity: String(1 - age / 0.3),
          left: `${snap(s.cur.px - size / 2)}px`, top: `${snap(s.cur.py - size / 2)}px`, width: `${snap(size)}px`, height: `${snap(size)}px`,
        });
      } else ui.ripple.style.display = 'none';
    } else {
      ui.cursor.style.display = 'none';
      ui.ripple.style.display = 'none';
    }

    // 平滑滚动信息板等容器
    if (scrollPlan && s.scrollP !== null && s.scrollP !== undefined) {
      const p = s.scrollP;
      const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
      scrollPlan.box.scrollTop = scrollPlan.from + (scrollPlan.to - scrollPlan.from) * e;
    }

    ui.fade.style.opacity = String(s.fade ?? 0);
  }

  function preload(names) {
    const keep = names.map((n) => {
      const i = new Image();
      i.src = `/art/${n}.png`;
      return i;
    });
    window.__promoKeep = keep;
    return Promise.all(keep.map((i) => i.decode().catch(() => {})));
  }

  window.__promo = {
    async init(cfg, { band, art }) {
      window.__promoConfig = cfg;
      if (band) {
        // 游戏画面让出底部 88px 给字幕条
        const st = document.createElement('style');
        st.textContent = `.app { height: calc(100vh - ${88 * unit()}px) !important; }`;
        document.head.append(st);
      }
      ui ??= makeUi();
      // 叠加层的字先加载好，免得第一次出现时换字体
      const text = JSON.stringify(cfg);
      await Promise.all([PIXEL, KAI].map((f) => document.fonts.load(`32px ${f.split(',')[0]}`, text)));
      await preload(art);
      await settle();
    },
    /** true：逐帧手动推进；false：恢复真实时间（画面外摆场景时用） */
    manual(on) {
      if (on && !manual) {
        clock = nNow() - offset;
        manual = true;
        for (const a of document.getAnimations()) a.pause();
      } else if (!on && manual) {
        offset = nNow() - clock;
        manual = false;
        for (const a of document.getAnimations()) a.play();
      }
    },
    /** 推进一帧的时间，按状态画叠加层，等画面就绪 */
    async frame(s, dt) {
      let left = dt;
      while (left > 1e-6) {
        const d = Math.min(1000 / 60, left);
        clock += d;
        left -= d;
        flush(clock);
      }
      for (const a of document.getAnimations()) {
        if (a.playState !== 'paused') a.pause();
        a.currentTime = (a.currentTime ?? 0) + dt;
      }
      draw(s);
      await settle();
    },
    /** 让 el 所在的滚动容器滚到 el 完整可见；返回是否需要滚动 */
    planScroll(elm) {
      let box = elm.parentElement;
      while (box && !(box.scrollHeight > box.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      if (!box) return false;
      const r = elm.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const margin = 16;
      let to = box.scrollTop;
      if (r.bottom > b.bottom - margin) to += r.bottom - b.bottom + margin;
      else if (r.top < b.top + margin) to -= b.top + margin - r.top;
      to = Math.max(0, Math.min(box.scrollHeight - box.clientHeight, to));
      scrollPlan = { box, from: box.scrollTop, to };
      return Math.abs(to - box.scrollTop) > 1;
    },
    playerX() {
      const p = document.querySelector('.actor.player');
      return p ? parseFloat(p.style.left) + parseFloat(p.style.width) / 2 : NaN;
    },
  };
})();


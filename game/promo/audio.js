// 宣传片配乐与音效：全部用代码合成的 8-bit 风格声音，不使用外部音频素材。
// 120 BPM，一小节 2 秒；各段落的起点和 record.js 里的分段对齐。

const SR = 48000;
const E8 = 0.25;
const BAR = 2;

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}

/** 方波去锯齿用的 polyBLEP */
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

class Track {
  constructor(n) {
    this.L = new Float32Array(n);
    this.R = new Float32Array(n);
  }
  add(i, v, pan) {
    if (i < 0 || i >= this.L.length) return;
    this.L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
    this.R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
  }
}

/** 一个音：wave 为 square / tri / sine；drop 为起音时的音高下滑（八度），用于底鼓 */
function tone(tr, o) {
  const { t0, dur, f, wave = 'square', duty = 0.5, vol = 0.1, a = 0.004, d = 0.08, s = 0.6, r = 0.05, pan = 0, vib = 0, lp = 1, drop = 0, dropTime = 0.08, to } = o;
  const i0 = Math.round(t0 * SR);
  const len = Math.round((dur + r) * SR);
  let ph = 0;
  let y = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let fr = f;
    if (drop) fr *= 2 ** (drop * Math.exp(-tt / dropTime));
    if (to) fr = f * (to / f) ** Math.min(1, tt / dur);
    if (vib && tt > 0.15) fr *= 1 + vib * Math.sin(2 * Math.PI * 5.5 * tt);
    const dt = fr / SR;
    ph = (ph + dt) % 1;
    let v;
    if (wave === 'square') v = (ph < duty ? 1 : -1) + blep(ph, dt) - blep((ph - duty + 1) % 1, dt);
    else if (wave === 'tri') v = 4 * Math.abs(ph - 0.5) - 1;
    else v = Math.sin(2 * Math.PI * ph);
    let env = tt < a ? tt / a : tt < a + d ? 1 - ((1 - s) * (tt - a)) / d : s;
    if (tt > dur) env *= Math.max(0, 1 - (tt - dur) / r);
    y += lp * (v * env - y);
    tr.add(i0 + i, y * vol, pan);
  }
}

/** 噪声：hp 取差分让声音更亮；swell 为渐强（渐强段用低通逐渐打开） */
function noise(tr, o) {
  const { t0, dur, vol = 0.1, decay = 0.1, hp = true, pan = 0, swell = false } = o;
  const rand = rng(Math.round(t0 * 1000) + 7);
  const i0 = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  let prev = 0;
  let y = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    let x = rand();
    if (hp) {
      const dx = x - prev;
      prev = x;
      x = dx * 0.5;
    }
    let env;
    if (swell) {
      const p = tt / dur;
      env = p * p;
      y += (0.02 + 0.5 * p) * (x - y);
      x = y;
    } else env = Math.exp(-tt / decay);
    tr.add(i0 + i, x * env * vol, pan);
  }
}

const kick = (tr, t0, vol = 0.5) => tone(tr, { t0, dur: 0.18, f: 48, wave: 'sine', vol, a: 0.001, d: 0.18, s: 0, r: 0.02, drop: 1.6, dropTime: 0.03 });
function snare(tr, t0, vol = 0.22) {
  noise(tr, { t0, dur: 0.2, vol, decay: 0.07 });
  tone(tr, { t0, dur: 0.06, f: 185, wave: 'tri', vol: vol * 0.7, a: 0.001, d: 0.06, s: 0, r: 0.02 });
}
const hat = (tr, t0, vol = 0.05) => noise(tr, { t0, dur: 0.05, vol, decay: 0.015, pan: 0.3 });
const crash = (tr, t0, vol = 0.12) => noise(tr, { t0, dur: 1.4, vol, decay: 0.45, pan: -0.2 });

// ---------- 配乐 ----------

/** 和弦：低音、三个和弦音 */
const CHORDS = {
  Am: [45, [57, 60, 64]],
  F: [41, [53, 57, 60]],
  C: [48, [55, 60, 64]],
  G: [43, [55, 59, 62]],
  E: [40, [56, 59, 64]],
  Dm: [38, [57, 62, 65]],
  A: [45, [57, 61, 64]],
};

// 每小节：段落类型、和弦、旋律（音高，八分音符个数；0 为休止）
const MOTIF_1 = [[69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [74, 2]];
const MOTIF_2 = [[72, 1], [69, 1], [65, 2], [69, 1], [72, 1], [69, 2]];
const BARS = [
  { sec: 'cold' },
  { sec: 'cold', pad: 'Am' },
  { sec: 'cold', pad: 'Am', riser: true },
  { sec: 'title', ch: 'Am', crash: true, mel: [[69, 4], [76, 4]] },
  { sec: 'title', ch: 'F', mel: [[72, 2], [74, 2], [76, 4]] },
  { sec: 'full', ch: 'Am', mel: MOTIF_1 },
  { sec: 'full', ch: 'F', mel: MOTIF_2 },
  { sec: 'full', ch: 'C', mel: [[67, 1], [72, 1], [76, 2], [79, 1], [76, 1], [74, 2]] },
  { sec: 'full', ch: 'G', mel: [[74, 2], [71, 2], [67, 2], [0, 2]] },
  { sec: 'full', ch: 'Am', mel: [[76, 1], [76, 1], [81, 2], [79, 1], [76, 1], [72, 2]] },
  { sec: 'full', ch: 'F', mel: [[77, 2], [76, 1], [72, 1], [69, 2], [72, 2]] },
  { sec: 'full', ch: 'C', mel: [[76, 2], [79, 1], [76, 1], [72, 1], [74, 1], [76, 2]] },
  { sec: 'full', ch: 'G', mel: [[74, 3], [71, 1], [67, 2], [71, 2]] },
  { sec: 'full', ch: 'F', mel: [[69, 2], [72, 2], [77, 2], [76, 2]] },
  { sec: 'full', ch: 'G', mel: [[74, 2], [71, 2], [79, 2], [77, 2]] },
  { sec: 'full', ch: 'E', mel: [[76, 2], [68, 2], [71, 2], [74, 2]] },
  { sec: 'soft', ch: 'Am', mel: [[72, 4], [71, 2], [69, 2]] },
  { sec: 'soft', ch: 'F', mel: [[69, 4], [72, 4]] },
  { sec: 'soft', ch: 'G', mel: [[71, 4], [74, 4]] },
  { sec: 'build', ch: 'E', mel: [[76, 2], [74, 2], [72, 2], [71, 2]] },
  { sec: 'full', ch: 'Am', crash: true, mel: MOTIF_1 },
  { sec: 'full', ch: 'F', mel: MOTIF_2 },
  { sec: 'full', ch: 'G', mel: [[71, 2], [74, 2], [79, 4]] },
  { sec: 'half', ch: 'Dm', mel: [[77, 2], [76, 2], [74, 2], [69, 2]] },
  { sec: 'half', ch: 'E', mel: [[68, 4], [71, 4]] },
  { sec: 'end', ch: 'A', crash: true, mel: [[73, 4], [76, 4]] },
  { sec: 'end', ch: 'A', mel: [[81, 8]] },
  { sec: 'tail', ch: 'A' },
];

export const MUSIC_BARS = BARS.length;

function renderMusic(n) {
  const mix = new Track(n);
  const lead = new Track(n);
  BARS.forEach((bar, b) => {
    const t0 = b * BAR;
    const { sec } = bar;
    if (bar.pad) {
      for (const m of [45, 52, 57]) tone(mix, { t0, dur: BAR, f: hz(m), wave: 'tri', vol: 0.05, a: 1.2, d: 0.1, s: 1, r: 0.3 });
    }
    if (bar.riser) noise(mix, { t0: t0 + 1, dur: 1, vol: 0.1, swell: true });
    if (bar.crash) crash(mix, t0);
    if (!bar.ch) return;
    const [root, triad] = CHORDS[bar.ch];

    // 低音
    if (sec === 'full' || sec === 'title' || sec === 'build') {
      for (let i = 0; i < 8; i++) tone(mix, { t0: t0 + i * E8, dur: E8 * 0.8, f: hz(root + (i % 2 ? 12 : 0)), wave: 'tri', vol: 0.22, a: 0.003, d: 0.05, s: 0.8, r: 0.03 });
    } else if (sec === 'soft') {
      for (let i = 0; i < 4; i++) tone(mix, { t0: t0 + i * 0.5, dur: 0.42, f: hz(root), wave: 'tri', vol: 0.2, a: 0.004, d: 0.1, s: 0.7, r: 0.05 });
    } else if (sec === 'half') {
      for (let i = 0; i < 2; i++) tone(mix, { t0: t0 + i, dur: 0.9, f: hz(root), wave: 'tri', vol: 0.22, a: 0.004, d: 0.1, s: 0.8, r: 0.08 });
    } else {
      tone(mix, { t0, dur: sec === 'tail' ? 1.2 : BAR, f: hz(root), wave: 'tri', vol: 0.22, a: 0.004, d: 0.2, s: 0.8, r: sec === 'tail' ? 0.8 : 0.1 });
    }

    // 琶音
    const arp = [triad[0], triad[1], triad[2], triad[0] + 12];
    const order = [0, 1, 2, 3, 2, 1, 2, 3];
    if (sec === 'full' || sec === 'title' || sec === 'build') {
      for (let i = 0; i < 16; i++) tone(mix, { t0: t0 + i * 0.125, dur: 0.1, f: hz(arp[order[i % 8]]), duty: 0.125, vol: 0.045, a: 0.002, d: 0.06, s: 0.4, r: 0.02, lp: 0.5, pan: -0.35 });
    } else if (sec !== 'tail') {
      const k = sec === 'end' ? 0.8 : 1;
      for (let i = 0; i < 8; i++) tone(mix, { t0: t0 + i * E8, dur: 0.2, f: hz(arp[order[i]]), duty: 0.125, vol: 0.04 * k, a: 0.003, d: 0.1, s: 0.3, r: 0.05, lp: 0.4, pan: -0.35 });
    } else {
      tone(mix, { t0, dur: 1.2, f: hz(arp[0] + 12), duty: 0.25, vol: 0.05, a: 0.01, d: 0.4, s: 0.5, r: 0.8, lp: 0.4 });
      for (const m of triad) tone(mix, { t0, dur: 1.2, f: hz(m), wave: 'tri', vol: 0.05, a: 0.01, d: 0.3, s: 0.8, r: 0.8 });
    }

    // 鼓
    for (let beat = 0; beat < 4; beat++) {
      const tb = t0 + beat * 0.5;
      if (sec === 'full' || sec === 'title' || sec === 'build') {
        if (beat % 2 === 0) kick(mix, tb);
        if (sec === 'full' && beat % 2 === 1) snare(mix, tb);
        hat(mix, tb, 0.035);
        hat(mix, tb + E8, 0.06);
      } else if (sec === 'soft') {
        if (beat === 0) kick(mix, tb, 0.35);
        hat(mix, tb + E8, 0.035);
      } else if (sec === 'half') {
        if (beat === 0) kick(mix, tb);
        if (beat === 2) snare(mix, tb);
        hat(mix, tb + E8, 0.04);
      }
    }
    if (sec === 'build') for (let i = 0; i < 8; i++) snare(mix, t0 + 1 + i * 0.125, 0.05 + 0.03 * i);

    // 旋律
    let tm = t0;
    for (const [m, len] of bar.mel ?? []) {
      const dur = len * E8;
      if (m) {
        const soft = sec === 'soft';
        tone(lead, {
          t0: tm, dur: dur * 0.9, f: hz(m), duty: soft ? 0.5 : 0.25, vol: soft ? 0.09 : 0.12,
          a: 0.005, d: 0.12, s: 0.6, r: 0.08, vib: len >= 4 ? 0.006 : 0.003, lp: soft ? 0.18 : 0.3, pan: 0.1,
        });
      }
      tm += dur;
    }
  });

  // 旋律加一点乒乓回声
  const delay = Math.round(0.375 * SR);
  for (let i = 0; i < n; i++) {
    const l = lead.L[i];
    const r = lead.R[i];
    mix.L[i] += l;
    mix.R[i] += r;
    if (i + delay < n) {
      lead.R[i + delay] += l * 0.3;
      lead.L[i + delay] += r * 0.3;
    }
  }
  return mix;
}

// ---------- 音效 ----------

function renderSfx(n, events) {
  const tr = new Track(n);
  for (const { t, type } of events) {
    switch (type) {
      case 'beep':
        tone(tr, { t0: t, dur: 0.09, f: 988, wave: 'sine', vol: 0.14, a: 0.003, d: 0.05, s: 0.7, r: 0.03 });
        break;
      case 'type':
        noise(tr, { t0: t, dur: 0.03, vol: 0.06, decay: 0.008 });
        break;
      case 'click':
        tone(tr, { t0: t, dur: 0.02, f: 1320, vol: 0.07, a: 0.001, d: 0.02, s: 0, r: 0.01 });
        noise(tr, { t0: t, dur: 0.02, vol: 0.05, decay: 0.006 });
        break;
      case 'key':
        tone(tr, { t0: t, dur: 0.03, f: 700, vol: 0.07, a: 0.001, d: 0.03, s: 0, r: 0.01 });
        noise(tr, { t0: t, dur: 0.02, vol: 0.05, decay: 0.006 });
        break;
      case 'open':
        tone(tr, { t0: t, dur: 0.04, f: hz(72), duty: 0.25, vol: 0.06, s: 0.8, r: 0.02 });
        tone(tr, { t0: t + 0.045, dur: 0.05, f: hz(79), duty: 0.25, vol: 0.06, s: 0.8, r: 0.03 });
        break;
      case 'collect':
        tone(tr, { t0: t, dur: 0.06, f: hz(83), duty: 0.25, vol: 0.08, s: 0.8, r: 0.03 });
        tone(tr, { t0: t + 0.065, dur: 0.14, f: hz(88), duty: 0.25, vol: 0.08, s: 0.7, r: 0.12 });
        tone(tr, { t0: t + 0.2, dur: 0.1, f: hz(88), duty: 0.25, vol: 0.025, s: 0.7, r: 0.1 });
        break;
      case 'reveal':
        tone(tr, { t0: t, dur: 0.05, f: 660, to: 990, duty: 0.25, vol: 0.06, s: 0.7, r: 0.02 });
        break;
      case 'wrong':
        tone(tr, { t0: t, dur: 0.09, f: hz(64), vol: 0.09, s: 0.8, r: 0.02 });
        tone(tr, { t0: t + 0.11, dur: 0.16, f: hz(60), vol: 0.09, s: 0.8, r: 0.06 });
        break;
      case 'pop':
        tone(tr, { t0: t, dur: 0.05, f: 600, to: 1200, duty: 0.25, vol: 0.06, s: 0.7, r: 0.02 });
        break;
      case 'hit':
        kick(tr, t, 0.35);
        noise(tr, { t0: t, dur: 0.15, vol: 0.1, decay: 0.05 });
        break;
      case 'tick':
        tone(tr, { t0: t, dur: 0.015, f: 1760, duty: 0.25, vol: 0.035, a: 0.001, s: 0.6, r: 0.01 });
        break;
      default:
        throw new Error(`未知音效：${type}`);
    }
  }
  return tr;
}

// ---------- 输出 ----------

function wav(L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  return buf;
}

/** 返回 16 位立体声 WAV。music 为 false 时只有音效，方便另配音乐 */
export function renderAudio({ duration, events, music = true, fadeOut = 1.2 }) {
  const n = Math.round(duration * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const parts = [renderSfx(n, events)];
  if (music) parts.push(renderMusic(n));
  for (const p of parts) {
    for (let i = 0; i < n; i++) {
      L[i] += p.L[i];
      R[i] += p.R[i];
    }
  }
  let peak = 1e-9;
  for (let i = 0; i < n; i++) {
    L[i] = Math.tanh(L[i] * 1.1);
    R[i] = Math.tanh(R[i] * 1.1);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const gain = 0.89 / peak;
  const fadeStart = n - Math.round(fadeOut * SR);
  for (let i = 0; i < n; i++) {
    const g = gain * Math.min(1, i / (0.01 * SR)) * (i > fadeStart ? (n - i) / (n - fadeStart) : 1);
    L[i] *= g;
    R[i] *= g;
  }
  return wav(L, R);
}

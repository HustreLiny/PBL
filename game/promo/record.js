// 宣传片：npm run promo。先构建，再用本机的 Chrome 或 Edge 逐帧录下游戏画面，配上代码合成的音乐和音效，输出 1080p MP4。
// 需要本机装有 ffmpeg。片尾要显示网址时：npm run promo -- --url=https://你的网址
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { launch, watch } from '../e2e/util.js';
import { renderAudio } from './audio.js';
import { Director } from './director.js';
import { SHOTS } from './shots.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('./out/', import.meta.url));
const siteUrl = process.argv.find((a) => a.startsWith('--url='))?.slice(6) ?? '';

const FPS = 30;
/** 页面按 1152×648 排版，截图放大到 1920×1080；叠加层的 1280×720 设计坐标乘 0.9 */
const VIEW = { width: 1152, height: 648 };
const DPR = 1920 / VIEW.width;
const U = VIEW.width / 1280;

/** 各段的起点（秒），和配乐的小节对齐（一小节 2 秒） */
const T = { cold: 0, title: 6, explore: 10, his: 16.5, report: 20, fix: 28, talk: 32, montage: 38, mdt: 42, eval: 46, end: 50, total: 56 };

const GOLD = '#e3b341';
const CFG = {
  cold: {
    speed: 14,
    vitals: 'BP 150/90   HR 120   T 39℃',
    lines: [
      { text: '外院转来，22 岁，孕 19 周。', at: 0.3 },
      { text: '黄疸三天，越来越重。', at: 1.6 },
      { text: '发热、寒战，牙龈出血。', at: 2.6 },
      { text: '“医生，她到底怎么了？”', at: 3.9, color: GOLD },
    ],
  },
  title: {
    title: '妊娠黄疸', charAt: [0, 0.25, 0.5, 0.75], sub: 'PBL 互动推理游戏', line: '改编自真实教学病例',
    sprites: [['sprite-patient', 180, 1], ['sprite-family', 300, -1], ['sprite-player', 400, -1], ['sprite-senior', 460, -1]],
  },
  montage: {
    dur: T.mdt - T.montage,
    items: [
      ['序章', '接诊', 'scene-er', 640], ['第一章', '黄灯停', 'scene-er-bed', 720], ['第二章', '歧路', 'scene-workstation', 640],
      ['第三章', '山重水复', 'scene-seminar', 720], ['第四章', '乱麻', 'scene-talkroom', 480], ['第五章', '退潮', 'scene-icu', 640],
      ['第六章', '始作俑者？', 'scene-ward', 640],
    ].map(([no, title, art, width], i) => ({ no, title, art, width, at: i * 0.5 })),
  },
  mdt: {
    title: '多学科会诊', line: '拿出依据，说服每一位会诊医生',
    people: [['portrait-hema', '血液科'], ['portrait-icu', 'ICU'], ['portrait-gi', '消化科'], ['portrait-ob', '产科']],
  },
  eval: {
    rows: [
      { label: '临床评价', color: '#3f7f6e', fill: 10, at: 0.3 },
      { label: '患者评价', color: '#c9704a', fill: 8, at: 0.8 },
    ],
    endLabel: '结局', ends: [['好', '#3f7f6e'], ['中', '#b08a3a'], ['坏', '#8a4b4b']], endAt: [1.9, 2.05, 2.2],
    line: '每个判断、每句话，都会写进结局',
  },
  end: {
    dur: T.total - T.end, title: '妊娠黄疸', sub: '这一次，由你来接诊', info: '序章与六章 · 单人 · 电脑、平板浏览器', url: siteUrl,
    small: '病例改编自医学院 PBL 教学病例，仅供医学教学使用',
    stand: [['sprite-player', 190, 1]],
    walkers: [['sprite-patient', 470, 262], ['sprite-family', 540, 330]],
  },
};

const ART = [
  'scene-er', 'scene-er-bed', 'scene-workstation', 'scene-seminar', 'scene-talkroom', 'scene-icu', 'scene-ward',
  'sprite-player', 'sprite-senior', 'sprite-patient', 'sprite-family', 'portrait-hema', 'portrait-icu', 'portrait-gi', 'portrait-ob',
];

/** 整屏画面里的音效，按画面的时间算好 */
function coverSfx() {
  const ev = [];
  const add = (t, type) => ev.push({ t, type });
  const { cold } = CFG;
  for (const l of cold.lines) [...l.text].forEach((c, i) => c.trim() && add(T.cold + l.at + (i + 1) / cold.speed, 'type'));
  for (let k = 1; k * 0.5 < T.title - T.cold; k++) add(T.cold + k * 0.5, 'beep');
  CFG.title.charAt.forEach((a) => add(T.title + a, 'pop'));
  CFG.montage.items.forEach((it) => add(T.montage + it.at, 'hit'));
  CFG.mdt.people.forEach((_, i) => add(T.mdt + 0.05 + 0.1 * i, 'pop'));
  for (const r of CFG.eval.rows) for (let i = 1; i <= r.fill; i++) add(T.eval + r.at + i / r.fill, 'tick');
  CFG.eval.endAt.forEach((a) => add(T.eval + a, 'pop'));
  return ev;
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} 退出码 ${c}`))));
  });
}

mkdirSync(out, { recursive: true });
const video = out + 'video.mp4';
const audio = out + 'audio.wav';
const final = out + '妊娠黄疸-宣传片.mp4';

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'animation', '-pix_fmt', 'yuv420p', video,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => {
  ff.on('error', rej);
  ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg 退出码 ${c}`))));
});
/** 片名画面完整出现后的一帧存为封面 */
const POSTER = T.title + 2.6;
let poster = false;
function write(png, t) {
  if (!poster && t >= POSTER) {
    writeFileSync(out + 'poster.png', png);
    poster = true;
  }
  if (Math.round(t * FPS) % FPS === 0) process.stdout.write(`\r录制 ${Math.round(t)}/${T.total} 秒`);
  return new Promise((res, rej) => ff.stdin.write(png, (e) => (e ? rej(e) : res())));
}

const server = await preview({ root, logLevel: 'silent', preview: { port: 4191 } });
const url = server.resolvedUrls.local[0];
const browser = await launch();
const started = Date.now();
let failed = false;
let errors = [];
let d;
try {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
  await ctx.addInitScript({ path: fileURLToPath(new URL('./page.js', import.meta.url)) });
  const page = await ctx.newPage();
  errors = watch(page);
  d = new Director({ fps: FPS, u: U, write, clip: { x: 0, y: 0, ...VIEW, scale: DPR } });
  await d.attach(page);

  /** 镜头外用真实时间摆好画面，再切回逐帧 */
  const prep = async (setup) => {
    await page.evaluate(() => window.__promo?.manual(false));
    await setup(page, url);
    await page.evaluate(([cfg, art]) => window.__promo.init(cfg, { band: true, art }), [CFG, ART]);
    await page.evaluate(() => window.__promo.manual(true));
    d.st.cur = null;
    d.unhighlight();
  };

  await prep(SHOTS.explore.setup);
  d.cover('cold');
  await d.until(T.title);
  d.cover('title');
  await d.until(T.explore);
  d.cover(null);
  d.st.band = true;
  await d.shot('走动与问话', T.his, () => SHOTS.explore.run(d, page));
  await prep(SHOTS.his.setup);
  await d.shot('HIS', T.report, () => SHOTS.his.run(d, page));
  await prep(SHOTS.report.setup);
  await d.shot('汇报', T.fix, () => SHOTS.report.run(d, page));
  await d.shot('修改', T.talk - 0.25, () => SHOTS.fix.run(d, page));
  d.fade(0, 1, 0.25);
  await d.until(T.talk);
  await prep(SHOTS.talk.setup);
  d.fade(1, 0, 0.3);
  await d.shot('谈话', T.montage, () => SHOTS.talk.run(d, page));

  Object.assign(d.st, { band: false, cur: null, hl: null });
  d.caption(null);
  d.keys([]);
  const covers = ['montage', 'mdt', 'eval', 'end'];
  for (const [i, k] of covers.entries()) {
    d.cover(k);
    await d.until(T[covers[i + 1]] ?? T.total);
  }
} catch (e) {
  failed = true;
  console.error(`\n录制中断：${e.message.split('\n')[0]}`);
} finally {
  ff.stdin.end();
  await browser.close();
  server.httpServer.close();
}
await ffDone;
if (failed) process.exit(1);

writeFileSync(audio, renderAudio({ duration: T.total, events: [...coverSfx(), ...d.events] }));
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
rmSync(video);
rmSync(audio);

for (const w of [...d.warnings, ...errors]) console.warn(`\n注意：${w}`);
console.log(`\n完成（${Math.round((Date.now() - started) / 1000)} 秒）：${final}`);

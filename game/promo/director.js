// 宣传片的镜头控制：逐帧推进游戏时间并截图，同时摆弄叠加层里的光标、字幕、按键和高亮。
// 叠加层按 1280×720 排版（设计坐标）；页面里元素的位置是实际 CSS 像素，要除以 u 换算过去。

const ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

export class Director {
  /** write(png, t)：收下一帧截图；clip：截图范围，scale 为放大倍数 */
  constructor({ fps, u, write, clip }) {
    this.fps = fps;
    this.u = u;
    this.write = write;
    this.clip = clip;
    this.n = 0;
    this.events = [];
    this.warnings = [];
    this.st = { band: false, cap: null, keyList: [], keys: {}, hl: null, cur: null, cover: null, fade: 0, scrollP: null };
  }

  get t() {
    return this.n / this.fps;
  }

  async attach(page) {
    this.page = page;
    this.cdp = await page.context().newCDPSession(page);
  }

  /** 推进一帧：页面时间前进 1/fps 秒，画叠加层，截图 */
  async frame() {
    const f = this.fadePlan;
    if (f) {
      const p = Math.min(1, (this.t - f.t0) / f.dur);
      this.st.fade = f.from + (f.to - f.from) * p;
      if (p >= 1) this.fadePlan = null;
    }
    const { cover, ...rest } = this.st;
    const s = { ...rest, now: this.t, cover: cover && { kind: cover.kind, t: this.t - cover.t0 } };
    await this.page.evaluate(([s, dt]) => window.__promo.frame(s, dt), [s, 1000 / this.fps]);
    const { data } = await this.cdp.send('Page.captureScreenshot', { format: 'png', clip: this.clip, optimizeForSpeed: true });
    await this.write(Buffer.from(data, 'base64'), this.t);
    this.n++;
  }

  /** 一直录到时间 t；each(t) 在每帧之前调用 */
  async until(t, each) {
    while (this.t < t - 1e-6) {
      each?.(this.t);
      await this.frame();
    }
  }

  wait(sec, each) {
    return this.until(this.t + sec, each);
  }

  /** 镜头要在 end 之前做完；超时只记下来，不中断录制 */
  async shot(name, end, fn) {
    await fn();
    if (this.t > end + 1e-6) this.warnings.push(`${name} 超时 ${(this.t - end).toFixed(2)} 秒`);
    await this.until(end);
  }

  sfx(type, t = this.t) {
    this.events.push({ t, type });
  }

  caption(text) {
    this.st.cap = text ? { text, t0: this.t } : null;
  }

  cover(kind) {
    this.st.cover = kind ? { kind, t0: this.t } : null;
  }

  /** 黑场在 dur 秒内从 from 渐变到 to */
  fade(from, to, dur) {
    this.fadePlan = { t0: this.t, from, to, dur };
  }

  keys(list) {
    this.st.keyList = list;
    this.st.keys = {};
  }

  async press(key, label) {
    this.st.keys[label] = this.t;
    this.sfx('key');
    await this.page.keyboard.press(key);
  }

  /** 按住方向键，直到小人走到 done(x) 为真的位置 */
  async walk(key, label, done, max = 4) {
    this.st.keys[label] = true;
    this.sfx('key');
    await this.page.keyboard.down(key);
    const end = this.t + max;
    while (this.t < end && !done(await this.page.evaluate(() => window.__promo.playerX()))) await this.frame();
    await this.page.keyboard.up(key);
    this.st.keys[label] = false;
  }

  /** 光标移到设计坐标 (x, y)；真实鼠标跟着走，按钮的悬停效果才会出现 */
  async move(x, y, dur = 0.45) {
    const c = (this.st.cur ??= { x: 1180, y: 640, a: 0, p0: null, px: 0, py: 0 });
    const [x0, y0, a0] = [c.x, c.y, c.a];
    const n = Math.max(1, Math.round(dur * this.fps));
    for (let i = 1; i <= n; i++) {
      const p = ease(i / n);
      c.x = x0 + (x - x0) * p;
      c.y = y0 + (y - y0) * p;
      c.a = Math.min(1, a0 + i / 4);
      await this.page.mouse.move(c.x * this.u, c.y * this.u);
      await this.frame();
    }
  }

  hideCursor() {
    if (this.st.cur) this.st.cur.a = 0;
  }

  /** 元素在滚动容器里看不全时，用 0.35 秒平滑滚过去 */
  async reveal(loc) {
    if (!(await loc.evaluate((el) => window.__promo.planScroll(el)))) return;
    const n = Math.round(0.35 * this.fps);
    for (let i = 1; i <= n; i++) {
      this.st.scrollP = i / n;
      await this.frame();
    }
    this.st.scrollP = null;
  }

  /** 元素的位置（设计坐标）；at 为点在元素里的相对位置 */
  async point(loc, at = [0.5, 0.5]) {
    const b = await loc.boundingBox();
    if (!b) throw new Error(`找不到元素：${loc}`);
    return [(b.x + b.width * at[0]) / this.u, (b.y + b.height * at[1]) / this.u];
  }

  /** 光标移过去，真的点一下 */
  async click(loc, { dur = 0.45, sfx = 'click', at, after = 0 } = {}) {
    await loc.waitFor({ state: 'visible', timeout: 5000 });
    await this.reveal(loc);
    const [x, y] = await this.point(loc, at);
    await this.move(x, y, dur);
    Object.assign(this.st.cur, { p0: this.t, px: x, py: y });
    if (sfx) this.sfx(sfx);
    await this.page.mouse.click(x * this.u, y * this.u);
    if (after) await this.wait(after);
  }

  /** 光标悬停在元素上一会儿 */
  async hover(loc, { dur = 0.45, stay = 0.4, at } = {}) {
    const [x, y] = await this.point(loc, at);
    await this.move(x, y, dur);
    await this.wait(stay);
  }

  async highlight(loc) {
    const b = await loc.boundingBox();
    this.st.hl = b && { x: b.x / this.u, y: b.y / this.u, w: b.width / this.u, h: b.height / this.u, t0: this.t };
  }

  unhighlight() {
    this.st.hl = null;
  }
}

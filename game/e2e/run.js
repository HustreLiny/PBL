// 自动检查：npm run e2e
// 先构建，再用本机的 Chrome（没有就用 Edge）跑无头浏览器：界面外壳、各种屏幕尺寸、平板触屏，以及好、中、坏三条通关路线。
// 也可以用 CHROME_PATH 指定浏览器路径。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { advance, launch, newGame, settle, walk, watch } from './util.js';
import { ROUTES, playRoute } from './play.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const failures = [];
function check(ok, name, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? `\n    ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

/** 标题页、关于、审阅入口、手机提示、出错页 */
async function shell(browser, url) {
  const p = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = watch(p);
  await p.goto(url);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  check((await p.locator('.review-box').count()) === 0, '标题页不显示审阅入口');
  await p.getByRole('button', { name: '关于' }).click();
  const about = await p.locator('.about').innerText();
  check(about.includes(`版本 ${version}`), `关于页显示版本 ${version}`, about.slice(0, 80));
  await p.getByRole('button', { name: '关闭' }).click();
  await p.goto(url + '?review');
  check((await p.locator('.review-box').count()) === 1, '网址加 ?review 后显示审阅入口');
  check(errors.length === 0, '标题页没有脚本错误或失败的请求', errors.join('；'));
  await p.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(url);
  check(await phone.locator('.small-screen').isVisible(), '手机屏幕提示改用电脑或平板');
  await phone.getByRole('button', { name: '仍然继续' }).click();
  check((await phone.locator('.small-screen').count()) === 0, '手机提示可以关掉');
  await phone.close();

  // 存档坏了：出错页可以回到本章开头，也可以清除存档
  const c = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await newGame(c, url);
  const key = await c.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith('pbl-save')));
  const breakSave = () => c.evaluate((k) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k)), chapter: 'zz' })), key);
  await breakSave();
  await c.reload();
  check(await c.locator('.crash').isVisible(), '存档损坏时显示出错页，不白屏');
  await c.getByRole('button', { name: '回到本章开头' }).click();
  const back = await c.locator('.topbar').innerText({ timeout: 5000 }).catch(() => '');
  check(back.includes('序章'), '出错页“回到本章开头”恢复到章节开头', back);
  await breakSave();
  await c.reload();
  await c.getByRole('button', { name: '清除存档，从头开始' }).click();
  const title = await c.locator('.title-screen').waitFor({ timeout: 5000 }).then(() => true, () => false);
  check(title, '出错页“清除存档”回到标题页');
  await c.close();
}

/** 各种屏幕尺寸：整页不滚动，选项浮在画面内，不用在选项框里滚动 */
async function layout(browser, url) {
  const sizes = [[1366, 768], [1280, 800], [1920, 1080], [1024, 768], [1180, 820], [820, 1180], [768, 1024]];
  const bad = await Promise.all(
    sizes.map(async ([w, h]) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const p = await ctx.newPage();
      await newGame(p, url);
      await walk(p, '师姐');
      const m = await p.evaluate(() => {
        const vp = document.querySelector('.viewport').getBoundingClientRect();
        const panel = document.querySelector('.scene-panel');
        const r = panel.getBoundingClientRect();
        return {
          page: document.documentElement.scrollHeight, win: innerHeight,
          inside: r.top >= vp.top && r.bottom <= vp.bottom, scroll: panel.scrollHeight > panel.clientHeight,
        };
      });
      await ctx.close();
      return m.page !== m.win || !m.inside || m.scroll ? `${w}×${h} ${JSON.stringify(m)}` : null;
    }),
  );
  const fails = bad.filter(Boolean);
  check(fails.length === 0, `${sizes.length} 种屏幕尺寸都一屏放下，选项在画面内`, fails.join('；'));
}

/** 平板触屏：点人物、点地面都能走，不显示回车提示 */
async function touch(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await newGame(p, url);
  await p.locator('.hs', { hasText: '师姐' }).first().tap();
  await settle(p);
  await advance(p);
  check((await p.locator('.scene-panel').count()) === 1, '平板：点师姐，小人走过去并打开选项');
  check(!(await p.locator('.hs-prompt').isVisible()), '平板：不显示回车提示');
  await p.locator('.option', { hasText: '离开' }).tap();
  const x0 = await p.evaluate(() => document.querySelector('.actor.player').style.left);
  const vp = await p.locator('.viewport').boundingBox();
  await p.touchscreen.tap(vp.x + vp.width * 0.9, vp.y + vp.height * 0.8);
  await settle(p);
  const x1 = await p.evaluate(() => document.querySelector('.actor.player').style.left);
  check(x0 !== x1, '平板：点地面，小人走过去', `${x0} → ${x1}`);
  await ctx.close();
}

const server = await preview({ root, logLevel: 'silent', preview: { port: 4190 } });
const url = server.resolvedUrls.local[0];
const browser = await launch();
const started = Date.now();
try {
  console.log('— 界面');
  await shell(browser, url);
  await layout(browser, url);
  await touch(browser, url);
  console.log(`— 通关（${ROUTES.length} 条路线同时跑，约一分钟）`);
  await Promise.all(
    ROUTES.map((r) =>
      playRoute(browser, url, r).then(({ route, results, info }) => {
        console.log(`${route.name}：${route.note}${info ? `。${info}` : ''}`);
        for (const x of results) check(x.ok, `  ${x.name}`, x.detail);
      }),
    ),
  );
} catch (e) {
  check(false, '检查中断', e.message.split('\n')[0]);
} finally {
  await browser.close();
  server.httpServer.close();
}
const secs = Math.round((Date.now() - started) / 1000);
console.log(failures.length ? `\n${failures.length} 项未通过（${secs} 秒）` : `\n全部通过（${secs} 秒）`);
process.exit(failures.length ? 1 : 0);

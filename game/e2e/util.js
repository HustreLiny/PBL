// 自动检查共用的小工具

/** 记录脚本错误和失败的请求；美术图还没做，/art/ 下的 404 不算 */
export function watch(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !new URL(r.url()).pathname.startsWith('/art/')) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}

/** 点掉对话；带信息的句子先点取。说过的话记进 said */
export async function advance(page, said = []) {
  for (let i = 0; i < 40; i++) {
    if ((await page.locator('.dialog-layer').count()) === 0) return;
    const text = await page.locator('.dialog-body').innerText();
    said.push(text.split('\n').filter((x) => !x.includes('点击空白')).join(' '));
    const info = page.locator('.info-line:not(.got)');
    if (await info.count()) await info.click();
    await page.locator('.dialog-layer').click({ position: { x: 5, y: 5 } });
  }
}

/** 清空存档，开始新游戏，关掉操作说明和开场对话 */
export async function newGame(page, url) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '从头开始' }).click();
  await page.getByRole('button', { name: '知道了' }).click();
  await advance(page);
}

/** 等小人停下 */
export async function settle(page) {
  await page.waitForTimeout(120);
  await page.waitForFunction(() => !document.querySelector('.actor.player.walking'), null, { timeout: 15000 });
  await page.waitForTimeout(80);
}

/** 点人物或物件，等小人走过去、处理完对话。画面外的也能点到 */
export async function walk(page, label, said) {
  await page.locator('.hs', { hasText: label }).first().dispatchEvent('click');
  await settle(page);
  await advance(page, said);
}

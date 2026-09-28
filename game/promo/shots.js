// 宣传片里的游戏镜头。setup 在镜头外用真实时间把游戏摆到要拍的位置；run 逐帧录下操作。
import { advance, walk } from '../e2e/util.js';

/** 从审阅入口开到某一章，关掉操作说明和开场对话 */
async function startAt(page, url, chapter) {
  await page.goto(url + '?review');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.review-box select').selectOption(chapter);
  await page.getByRole('button', { name: '从这一章开始' }).click();
  await page.getByRole('button', { name: '知道了' }).click();
  await advance(page);
}

/** 改存档后重新载入，直接进到要拍的画面 */
async function patchSave(page, fn) {
  const [key, s] = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('pbl-save'));
    return [k, JSON.parse(localStorage.getItem(k))];
  });
  fn(s);
  Object.assign(s, { dialog: [], afterDialog: null, help: false, selecting: null });
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, s]);
  await page.reload();
}

const addItems = (s, ids) => {
  s.collected = [...new Set([...s.collected, ...ids])];
};
const claim = (key, card, evidence) => ({ key, card, evidence, timing: null });

export const SHOTS = {
  // 第一章床旁：走到家属身边，问话，点取黄底信息
  explore: {
    setup: (page, url) => startAt(page, url, 'c1'),
    async run(d, p) {
      d.keys(['←', '→', '回车']);
      d.caption('左右走动，走近人物就能交谈');
      await d.wait(0.3);
      await d.walk('ArrowLeft', '←', (x) => x <= 352);
      await d.wait(0.2);
      await d.press('Enter', '回车');
      d.sfx('open');
      await d.wait(0.35);
      await d.click(p.locator('.scene-panel .option', { hasText: '问家属路上的情况' }), { after: 0.3 });
      d.keys([]);
      d.caption('黄底的话，点一下收进信息板');
      await d.wait(0.4);
      await d.click(p.locator('.info-line'), { sfx: 'collect', after: 0.15 });
      const item = p.locator('.tools .item', { hasText: 'Tmax 39' });
      await d.reveal(item);
      await d.highlight(item);
      await d.wait(0.8);
      d.unhighlight();
      await d.click(p.locator('.dialog-layer'), { at: [0.5, 0.12] });
    },
  },

  // 第二章 HIS：检验单打着码，一行行点开
  his: {
    async setup(page, url) {
      await startAt(page, url, 'c2');
      await walk(page, 'HIS 电脑');
    },
    async run(d, p) {
      d.keys([]);
      d.caption('检验单先打码，点开哪行看哪行');
      await d.wait(0.2);
      await d.click(p.locator('.his-entry', { hasText: '急诊血常规' }), { sfx: 'open', after: 0.25 });
      for (const name of ['HGB', 'PLT'])
        await d.click(p.locator('tr.masked-row', { hasText: name }), { dur: 0.35, sfx: 'reveal', after: 0.15 });
      await d.highlight(p.locator('.his-sheet tr', { hasText: 'PLT' }));
    },
  },

  // 第一章汇报：立论点、挂论据，交给上级；上级标出错的那张卡
  report: {
    async setup(page, url) {
      await startAt(page, url, 'c1');
      await patchSave(page, (s) => {
        s.phase = 'report';
        addItems(s, ['E03.1', 'E03.2', 'E03.3', 'E04.1', 'E05.1', 'E05.2', 'E06.1', 'E07.1']);
        s.answers = {
          ...s.answers,
          'Q1.1': [
            claim('m', 'Murphy 征阳性', ['E06.1']),
            claim('f', '发热伴寒战', ['E03.3']),
            claim('p', '右上腹痛', ['E03.2']),
            claim('b', '皮肤黏膜出血', ['E05.2']),
          ],
        };
      });
    },
    async run(d, p) {
      d.keys([]);
      d.caption('每张卡是一个论点，从信息板挑论据');
      await d.wait(0.3);
      await d.click(p.locator('.claim-new'), { sfx: 'open', after: 0.25 });
      await d.click(p.locator('.tray .concept', { hasText: /^黄疸进行性加深$/ }), { sfx: 'pop', after: 0.3 });
      const card = p.locator('.claim-card:not(.claim-new)').last();
      await d.click(card.locator('.slip-add'), { after: 0.3 });
      await d.click(p.locator('.tools .item', { hasText: '较前加深' }), { sfx: 'pop', after: 0.3 });
      await d.click(card.locator('.slip-add'), { after: 0.2 });
      await d.click(p.getByRole('button', { name: '交给上级' }));
      d.sfx('wrong', d.t + 0.1);
      d.caption('哪条有问题，上级医师会标出来');
      await d.wait(0.3);
      await d.highlight(p.locator('.claim-card.marked'));
    },
  },

  // 接着上一个镜头：删掉错卡再交，这一题过关
  fix: {
    async run(d, p) {
      d.unhighlight();
      d.caption('改好再交，一题一题过关');
      await d.click(p.getByRole('button', { name: '回去修改' }), { after: 0.2 });
      await d.click(p.locator('.claim-card.marked').getByRole('button', { name: '删除' }), { after: 0.3 });
      await d.click(p.getByRole('button', { name: '交给上级' }));
      d.sfx('collect', d.t + 0.1);
      await d.wait(0.3);
      await d.highlight(p.locator('.opinion'));
    },
  },

  // 第四章谈话：同一件事，换一种说法
  talk: {
    async setup(page, url) {
      await startAt(page, url, 'c4');
      await patchSave(page, (s) => {
        s.phase = 'talk';
        s.talkNode = 3;
        addItems(s, ['E16.1']);
        s.openedReports = [...new Set([...s.openedReports, 'R-E16'])];
      });
    },
    async run(d, p) {
      d.keys([]);
      d.caption('同样的话，换一种说法，结果就不一样');
      await d.wait(0.5);
      const opts = p.locator('.talk .option');
      await d.hover(opts.nth(1), { dur: 0.5, stay: 0.5 });
      await d.hover(opts.nth(2), { dur: 0.3, stay: 0.4 });
      await d.click(opts.nth(0), { after: 1.4 });
      await d.click(p.locator('.dialog-layer'), { at: [0.5, 0.15] });
    },
  },
};

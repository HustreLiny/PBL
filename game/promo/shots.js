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
  // 第一步，问诊：走到家属身边，主动选择问题，看到原始叙述
  consult: {
    setup: (page, url) => startAt(page, url, 'c1'),
    async run(d, p) {
      d.keys(['←', '→', '回车']);
      d.caption('01  问诊：走近患者、家属与医护人员');
      await d.wait(0.3);
      await d.walk('ArrowLeft', '←', (x) => x <= 352);
      await d.wait(0.2);
      await d.press('Enter', '回车');
      d.sfx('open');
      await d.wait(0.35);
      await d.click(p.locator('.scene-panel .option', { hasText: '问家属路上的情况' }), { after: 0.3 });
      d.keys([]);
      await d.highlight(p.locator('.dialog-body'));
      await d.wait(1.0);
    },
  },

  // 第二步，收数据：HIS 的结果逐行查看，查看后进入信息板
  collect: {
    async setup(page, url) {
      await startAt(page, url, 'c2');
      await walk(page, 'HIS 电脑');
    },
    async run(d, p) {
      d.keys([]);
      d.caption('02  收数据：从对话、查体和 HIS 提取原始信息');
      await d.wait(0.2);
      await d.click(p.locator('.his-entry', { hasText: '急诊血常规' }), { sfx: 'open', after: 0.25 });
      for (const name of ['HGB', 'PLT'])
        await d.click(p.locator('tr.masked-row', { hasText: name }), { dur: 0.35, sfx: 'reveal', after: 0.15 });
      await d.highlight(p.locator('.his-sheet tr', { hasText: 'PLT' }));
      await d.wait(0.45);
      d.unhighlight();
      await d.highlight(p.locator('.tools'));
      await d.wait(0.65);
    },
  },

  // 第三步，记笔记分析：把取得的数据整理成自己的问题表征
  notes: {
    async setup(page, url) {
      await startAt(page, url, 'c2');
      await patchSave(page, (s) => {
        s.phase = 'explore';
        addItems(s, ['E03.1', 'E03.3', 'E05.2', 'E08.1', 'E08.2', 'E09.1', 'E12.2']);
        s.openedReports = [...new Set([...s.openedReports, 'R-E08', 'R-E09', 'R-E12'])];
        s.notes = '';
      });
    },
    async run(d, p) {
      d.keys([]);
      d.caption('03  记笔记分析：把散点信息组织成判断');
      await d.wait(0.2);
      await d.click(p.getByRole('button', { name: '笔记', exact: true }), { after: 0.2 });
      const notes = p.locator('textarea.notes');
      await d.type(notes, '黄疸 + 发热寒战 + 出血\nPLT 18↓：不能只用胆道梗阻解释', { interval: 0.052 });
      await d.highlight(notes);
      await d.wait(0.65);
    },
  },

  // 第四步，提交报告：立论点、挂论据并交给上级
  report: {
    async setup(page, url) {
      await startAt(page, url, 'c1');
      await patchSave(page, (s) => {
        s.phase = 'report';
        addItems(s, ['E03.1', 'E03.2', 'E03.3', 'E04.1', 'E05.1', 'E05.2', 'E06.1', 'E07.1']);
        s.answers = {
          ...s.answers,
          'Q1.1': [
            claim('f', '发热伴寒战', ['E03.3']),
            claim('p', '右上腹痛', ['E03.2']),
            claim('b', '皮肤黏膜出血', ['E05.2']),
          ],
        };
      });
    },
    async run(d, p) {
      d.keys([]);
      d.caption('04  提交报告：一张卡一个论点，再挂上论据');
      await d.wait(0.3);
      await d.click(p.locator('.claim-new'), { sfx: 'open', after: 0.25 });
      await d.click(p.locator('.tray .concept', { hasText: /^黄疸进行性加深$/ }), { sfx: 'pop', after: 0.3 });
      const card = p.locator('.claim-card:not(.claim-new)').last();
      await d.click(card.locator('.slip-add'), { after: 0.3 });
      await d.click(p.locator('.tools .item', { hasText: '较前加深' }), { sfx: 'pop', after: 0.3 });
      await d.click(card.locator('.slip-add'), { after: 0.2 });
      await d.click(p.getByRole('button', { name: '交给上级' }));
      d.sfx('collect', d.t + 0.1);
      d.caption('上级只看你的论点，和它背后的原始依据');
      await d.wait(0.3);
      await d.highlight(p.locator('.opinion'));
      await d.wait(0.9);
    },
  },

  // 沟通不是旁支：同一件事的说法会影响患者与家属的回应
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
      d.caption('沟通：同一件事，怎么说也会改变结果');
      await d.wait(0.2);
      const opts = p.locator('.talk .option');
      await d.hover(opts.nth(1), { dur: 0.35, stay: 0.3 });
      await d.click(opts.nth(0), { dur: 0.35, after: 0.8 });
      await d.click(p.locator('.dialog-layer'), { dur: 0.3, at: [0.5, 0.15] });
    },
  },
};

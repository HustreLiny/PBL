// 按路线从序章玩到结局。好结局路线的做法与 审阅用-全章答案.md 一致
import { advance, settle, walk as walkTo, watch } from './util.js';

/** 信息板上条目的值，用来点选论据 */
const V = {
  'E02.3': '198 U/L', 'E02.4': '220 U/L', 'E02.5': '781.5 U/L',
  'E03.1': '较前加深', 'E03.2': '右上腹痛，NRS 5', 'E03.3': 'Tmax 39℃，伴寒战',
  'E05.1': '贫血貌，重度黄染', 'E05.2': '前胸及前臂散在瘀点，牙龈渗血',
  'E06.1': '腹软，右上腹轻压痛，无反跳痛及肌紧张，Murphy 征阴性',
  'E08.1': '70 g/L', 'E08.2': '18 ×10⁹/L', 'E09.1': '400.9 / 320.2 μmol/L', 'E09.4': '915 U/L',
  'E11.1': '20.6 mg/L', 'E12.2': '胆总管下段局限性狭窄，近端胆管扩张', 'E16.1': '无胎心，提示胎死宫内',
  'E19.1': '见黑胆汁', 'E19.2': '胆管下段狭窄，可疑小充盈缺损',
  'E20.TBil': '180.2 μmol/L', 'E21.HGB': '60 g/L', 'E21.PLT': '约 20 ×10⁹/L', 'E23.Smear': '大量破碎红细胞', 'E23.Ret': '10%',
  'E24.1': '<5%', 'E24.2': '阳性', 'E25.2': '前两次分别在孕 7、8 周自然流产', 'E26.2': '日晒后红斑发痒',
  'E27.1': '1:1280', 'E28.1': '2.2（原参考 <1.2）',
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ROUTES = [
  {
    name: '好结局路线',
    note: '照答案文档做，第五章紧急上报',
    emergency: true, talk4: ['first'], talk5: 'first',
    expect: { ending: '好', clinical: 26, patient: 13 },
  },
  {
    name: '中结局路线',
    note: '提 CT、第一题故意答错、第四章先谈砸再重谈',
    ct: true, wrongFirst: true, gate4: true, talk4: ['last', 'first'], talk5: 'first',
    expect: { ending: '中' },
  },
  {
    name: '坏结局路线',
    note: '两次谈话都选最差的，第四章由刘主任接手',
    talk4: ['last', 'last'], talk5: 'last',
    expect: { ending: '坏' },
  },
];

export async function playRoute(browser, url, route) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  const errors = watch(p);
  const said = [];
  const results = [];
  const check = (ok, name, detail = '') => results.push({ ok: !!ok, name, detail });
  const last = () => said.at(-1) ?? '';
  const adv = () => advance(p, said);
  const walk = (label) => walkTo(p, label, said);

  const opt = async (text) => {
    await p.locator('.option', { hasText: text }).first().click();
    await adv();
  };
  const his = async (label, titles) => {
    await walk(label);
    for (const t of titles) {
      await p.locator('.his-entry', { hasText: t }).first().click();
      const rows = p.locator('tr.masked-row');
      while (await rows.count()) await rows.first().click();
    }
    await p.getByRole('button', { name: '离开', exact: true }).click();
  };
  const exitCh = async (label) => {
    await walk('师姐');
    await p.locator('.option', { hasText: label }).first().click();
    await adv();
    const ok = p.locator('.option', { hasText: '问完了，走吧' });
    if (await ok.count()) {
      await ok.click();
      await adv();
    }
  };
  const suggest = async (label) => {
    await walk('师姐');
    await p.locator('.option', { hasText: '我想提个建议' }).click();
    await opt(label);
  };
  /** 作答一题并交给上级，返回上级医师意见 */
  const answer = async (claims) => {
    for (const [card, ev, timing] of claims) {
      await p.locator('.claim-new').click();
      await p.locator('.tray .concept', { hasText: new RegExp('^' + esc(card) + '$') }).click();
      const cardEl = p.locator('.claim-card:not(.claim-new)').last();
      if (timing) await cardEl.locator('.tchip', { hasText: timing }).click();
      if (ev?.length) {
        await cardEl.locator('.slip-add').click();
        for (const id of ev)
          await p.locator('.tools .item', { has: p.locator('.item-value', { hasText: new RegExp('^' + esc(V[id]) + '$') }) }).first().click();
        await cardEl.locator('.slip-add').click();
      }
    }
    await p.getByRole('button', { name: '交给上级' }).click();
    await adv();
    const op = (await p.locator('.opinion').innerText()).replace(/\n/g, ' ');
    await p.locator('.opinion button').click();
    await adv();
    return op;
  };
  const report = async (chapter, qs) => {
    for (const [i, q] of qs.entries()) {
      const op = await answer(q);
      if (!op.includes('这一题可以了')) throw new Error(`${chapter}第 ${i + 1} 题没有通过：${op}`);
    }
  };
  const talk = async (pick, n) => {
    for (let i = 0; i < n; i++) {
      await p.locator('.option')[pick]().click();
      await adv();
    }
  };
  const mdt = async (cards) => {
    for (const [cat, c] of cards) {
      await p.locator('.stage .tags').first().getByRole('button', { name: cat, exact: true }).click();
      await p.locator('.stage .pick-list .card', { hasText: c }).first().click();
    }
    await p.getByRole('button', { name: '出牌' }).click();
    await adv();
  };
  const reveal = async (title) => {
    const h = await p.locator('.reveal h2').innerText();
    check(h === title, `开放“${title}”`, h);
    await p.locator('.reveal button').click();
  };
  const chapterEnd = async (title) => {
    const h = await p.locator('.chapter-end h2').innerText();
    check(h.startsWith(title), `${title}结束`, h);
    await p.locator('.chapter-end button').click();
    await adv();
  };

  let step = '开始';
  let info = '';
  try {
    await p.goto(url);
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.getByRole('button', { name: '从头开始' }).click();
    check(await p.locator('.help').isVisible(), '开局弹出操作说明');
    await p.getByRole('button', { name: '知道了' }).click();
    await adv();

    step = '序章';
    // 用键盘走到师姐身边，出现回车提示后按回车
    await p.keyboard.down('ArrowLeft');
    await p.locator('.hs', { hasText: '师姐' }).locator('.hs-prompt').waitFor({ timeout: 5000 });
    await p.keyboard.up('ArrowLeft');
    await settle(p);
    await p.keyboard.press('Enter');
    const box = await p.evaluate(() => {
      const vp = document.querySelector('.viewport').getBoundingClientRect();
      const panel = document.querySelector('.scene-panel').getBoundingClientRect();
      return { page: document.documentElement.scrollHeight, win: innerHeight, vpBottom: vp.bottom, panelBottom: panel.bottom };
    });
    check(box.page === box.win && box.panelBottom <= box.vpBottom, '键盘走动、回车交互；整页不滚动，选项在画面内', JSON.stringify(box));
    await opt('听交班');
    await p.locator('.option', { hasText: '离开' }).click();
    await his('外院资料', ['外院化验']);
    await exitCh('去床旁');
    await chapterEnd('序章 · 接诊');

    step = '第一章';
    await walk('患者');
    for (const t of ['问路上有什么变化', '问头痛和精神状况', '查体：皮肤', '查体：腹部', '了解以前怀孕', '问以前体检']) await opt(t);
    await walk('家属');
    await opt('问家属路上的情况');
    await walk('监护仪');
    await opt('看生命体征');
    await exitCh('去找主任汇报');
    check(last().includes('还缺'), '没提建议时师姐拦住', last());
    await suggest('评估胎儿情况');
    await suggest('持续复评神经系统情况');
    if (route.ct) {
      await suggest('腹部 CT');
      check(said.some((x) => x.includes('辐射')), '建议腹部 CT 时家属反对');
    }
    await exitCh('去找主任汇报');
    const q11 = [['发热伴寒战', ['E03.3']], ['右上腹痛', ['E03.2', 'E06.1']], ['皮肤黏膜出血', ['E05.2']], ['贫血貌', ['E05.1']]];
    if (route.wrongFirst) {
      const op = await answer([['黄疸进行性加深', ['E03.1']], ['Murphy 征阳性', ['E06.1']]]);
      check(op.includes('标出来的') && (await p.locator('.claim-card.marked').count()) > 0, '错误论点被标红并给出意见', op);
      await p.locator('.claim-card:not(.claim-new)', { hasText: 'Murphy 征阳性' }).getByRole('button', { name: '删除' }).click();
    } else q11.unshift(['黄疸进行性加深', ['E03.1']]);
    await report('第一章', [
      q11,
      [['胆汁淤积（可能）', ['E02.3', 'E02.4']], ['溶血参与（待证实）', ['E02.5']]],
      [['胆道梗阻（待查）', ['E03.2']], ['肝胆系统感染（待查）', ['E03.3']], ['出血倾向／血液系统异常（待查）', ['E05.2']]],
    ]);
    await chapterEnd('第一章 · 黄灯停');

    step = '第二章';
    await his('HIS 电脑', ['急诊血常规', '急诊生化', '急诊凝血', '炎性指标', 'MRCP']);
    await exitCh('去找主任汇报');
    await report('第二章', [
      [['贫血', ['E08.1']], ['血小板严重减少', ['E08.2']], ['胆红素显著升高、以直接胆红素为主', ['E09.1']], ['胆总管下段狭窄', ['E12.2']]],
      [['胆道梗阻', ['E12.2', 'E09.1']], ['胆道感染（胆管炎）', ['E03.3', 'E11.1']]],
      [['胆总管梗阻', ['E12.2']], ['急性胆管炎', ['E03.3']], ['TMA 待鉴别', ['E08.2']]],
    ]);
    await chapterEnd('第二章 · 歧路');

    step = '第三章';
    await exitCh('去找主任汇报');
    check(last().includes('白板'), '没用白板时师姐拦住', last());
    await walk('会诊白板');
    await p.locator('.chip', { hasText: '胆道梗阻／胆管炎' }).click();
    await p.locator('.chip', { hasText: /^＋ TMA$/ }).click();
    await p.locator('.mark').first().click();
    await p.getByRole('button', { name: '离开白板' }).click();
    await exitCh('去找主任汇报');
    await report('第三章', [
      [['胆总管梗阻', ['E12.2']], ['急性胆管炎', ['E03.3', 'E11.1']]],
      [['TMA', ['E08.2', 'E09.4']], ['感染相关消耗／DIC', ['E08.2']]],
      [['血液异常的机制未证实', ['E08.2']], ['胆道诊断不能解释全部表现']],
    ]);
    await chapterEnd('第三章 · 山重水复');

    step = '第四章';
    if (route.gate4) {
      await walk('去谈话室');
      await walk('患者和家属');
      check(last().includes('产科超声'), '没看产科超声时不能开始谈话', last());
      await walk('回工作站');
    }
    await his('HIS 电脑', ['产科超声']);
    await walk('去谈话室');
    await walk('患者和家属');
    for (const [i, pick] of route.talk4.entries()) {
      const before = said.length;
      await talk(pick, 6);
      if (i === 0 && route.talk4.length > 1)
        check(said.slice(before).some((x) => x.includes('转去别的医院')), '第一次谈砸后家属提出转院');
    }
    await walk('回工作站');
    await exitCh('去找主任汇报');
    await report('第四章', [
      [['及时胆道引流（团队评估下）', ['E12.2']], ['抗感染', ['E03.3']], ['产科评估与协调', ['E16.1']]],
      [['引流可解除梗阻、控制感染', ['E12.2']], ['血小板低，操作出血风险高', ['E08.2']], ['胎死宫内需产科同步处理', ['E16.1']]],
      [
        ['先征求患者本人意见'], ['当前已知病情', ['E12.2']], ['胎儿情况如实告知', ['E16.1']], ['引流的必要性', ['E12.2']],
        ['操作风险（含出血）', ['E08.2']], ['替代方案与不确定性'],
      ],
    ]);
    await reveal('ERCP 记录');
    await chapterEnd('第四章 · 乱麻');

    step = '第五章';
    await his('HIS 电脑', ['引流后生化', '引流后血常规', '引流后尿检', '网织红']);
    await walk('去 ICU');
    await walk('护士');
    await opt('听交班');
    await p.locator('.option', { hasText: '离开' }).click();
    await walk('回工作站');
    if (route.emergency) {
      await walk('师姐');
      await p.locator('.option', { hasText: '有紧急情况' }).click();
      await p.locator('.pick-list .chip', { hasText: 'HGB：60 g/L' }).click();
      await p.getByRole('button', { name: '告诉师姐' }).click();
      await adv();
    }
    await exitCh('查房了');
    await report('第五章', [
      [['局部改善', ['E20.TBil']], ['整体仍危险', ['E21.HGB', 'E21.PLT']]],
      [['微血管病性溶血（MAHA）', ['E23.Smear', 'E23.Ret']], ['血小板消耗', ['E21.PLT']], ['疑似 TTP']],
      [['治疗前取血送 ADAMTS13 活性', null, '治疗前'], ['联系血液科', null, '立即'], ['血浆置换', null, '立即'], ['糖皮质激素', null, '立即']],
    ]);
    await mdt([['证据', '大量破碎红细胞'], ['证据', '约 20'], ['时序与判断', '高度怀疑']]);
    await mdt([['证据', '120 μmol/L'], ['机制', '肾脏受累']]);
    await mdt([['证据', '180.2'], ['诊断', '疑似 TTP'], ['救治动作', '继续抗感染']]);
    await mdt([['救治动作', '产科评估与协调'], ['时序与判断', '同时进行']]);
    const order = {
      '治疗前取血送 ADAMTS13 活性': '立即', 联系血液科: '立即', 血浆置换: '立即', 糖皮质激素: '立即',
      继续抗感染: '同时进行', 产科评估与协调: '同时进行', 复核诊断: '结果回报后',
    };
    for (const [k, v] of Object.entries(order)) await p.getByRole('button', { name: `${k}：${v}` }).click();
    await p.getByRole('button', { name: '确定方案' }).click();
    await adv();
    await talk(route.talk5, 7);
    await reveal('原病例回报');
    await chapterEnd('第五章 · 退潮');

    step = '第六章';
    await his('HIS 电脑', ['自身免疫', '抗磷脂', '24 h', '治疗经过']);
    await exitCh('去找主任汇报');
    await report('第六章', [
      [['胆道梗阻／胆管炎', ['E19.2']], ['iTTP', ['E24.1', 'E24.2']], ['SLE（高度考虑）', ['E26.2', 'E27.1']], ['胎死宫内', ['E16.1']], ['APS（待评估）', ['E28.1']]],
      [['SLE 背景与 iTTP：支持相关', ['E27.1', 'E24.2']], ['溶血→色素结石→梗阻：可能机制，未证实', ['E19.1']], ['LA 阳性＋妊娠丢失→APS：值得评估', ['E28.1', 'E25.2']]],
      [['胆管狭窄／梗阻的病因'], ['抗磷脂抗体是否持续阳性']],
    ]);
    await reveal('会诊意见与原病例后记');

    step = '结局';
    const text = await p.locator('.settle').innerText();
    const tier = text.match(/结局：(好|中|坏)/)?.[1];
    const [clinical, patient] = [...text.matchAll(/分值 (-?\d+)／参考满分 (\d+)/g)].map((m) => `${m[1]}／${m[2]}`);
    info = `临床 ${clinical}，患者 ${patient}`;
    check(tier === route.expect.ending, `结局为“${route.expect.ending}”`, `实际为“${tier}”，${info}`);
    if (route.expect.clinical !== undefined) {
      const want = `临床 ${route.expect.clinical}／24，患者 ${route.expect.patient}／13`;
      check(info === want, `分值与答案文档一致（${want}）`, info);
    }
    if (route.talk4.length > 1 && route.talk4.every((x) => x === 'last'))
      check((await p.locator('.ledger').innerText()).includes('上级介入'), '第二次谈砸后刘主任接手');
  } catch (e) {
    check(false, `流程中断（${step}）`, e.message.split('\n')[0]);
  }
  check(errors.length === 0, '没有脚本错误或失败的请求', errors.join('；'));
  await ctx.close();
  return { route, results, info };
}

# 妊娠黄疸 PBL 游戏

依据 `../游戏设计/逐章剧情与证据表-v1.md` v1.4 实现：序章与第一至六章，中档难度。

```bash
npm install
npm run dev      # 本地开发
npm test         # 判定规则与章节数据测试
npm run build    # 输出 dist/，Vercel 构建命令同此，输出目录 dist，根目录设为 game
```

审阅时可在标题页“审阅用：从某一章开始”直接跳到任一章。各章答案见 `审阅用-全章答案.md`。

## 美术替换

把图片放进 `public/art/`，文件名与占位图上标的一致，就会自动替换占位图。像素图按原始尺寸出图，显示时整体放大，保持像素锐利。

场景是横版卷轴：画面高 270，宽度因场景而异，镜头每次显示其中 480 宽的一段。人物站在 y = 234 这条地面线上。

| 文件名 | 原始尺寸 | 用在 | 画进背景的物件（中心横坐标） |
|---|---|---|---|
| scene-er.png | 640×270 | 序章：急诊抢救区 | 外院资料 100 |
| scene-er-bed.png | 720×270 | 第一、二章：急诊床旁 | 门 28、监护仪 70（离地 40）、病床 180、护理车电脑 640 |
| scene-workstation.png | 640×270 | 第二、四、五、六章：医生工作站 | HIS 电脑 110、门 612 |
| scene-seminar.png | 720×270 | 第三章：示教室 | HIS 电脑 80、会诊白板 310（离地 50）、门 692 |
| scene-ward.png | 640×270 | 第三、六章：病房 | 门 28、病床 240 |
| scene-talkroom.png | 480×270 | 第四章：谈话室 | 门 28、桌椅 300 |
| scene-icu.png | 640×270 | 第五章：ICU 床旁 | 门 28、病床 240 |
| sprite-player / senior / patient / family / nurse .png | 32×64 | 场景里的人物小人（4 头身） | 脚踩图片底边，面朝右画；玩家向左走时自动翻转 |
| portrait-senior / liu / patient / family / nurse / hema / icu / gi / ob / rheum .png | 96×128 | 对话头像 | |

物件的点击区域大约是：HIS 电脑 48×40，门 36×92，白板 110×64，其余 36×30。放入背景图后，这些占位色块变成透明，只留名字标签。画面里物件的位置和上表对不上时，改 `src/data/chapters/` 里对应条目的 `x` 即可。

## 像素字体

把 Fusion Pixel（缝合像素）12px 简体中文的 woff2 文件放到 `public/fonts/fusion-pixel.woff2`。没有这个文件时，自动使用系统字体。

## 内容所在

- 各章剧本、场景、卡池、判定规则：`src/data/chapters/`（第五章的剧本另在 `src/data/ch5.ts`）
- 病例信息条目与 HIS 检验单：`src/data/items.ts`
- 检查建议与师姐的回应：`src/data/suggestions.ts`
- 知识库：`src/data/knowledge.ts`
- 判定引擎：`src/engine/spec.ts`（声明式规则）、`src/engine/grade.ts` 与 `feedback.ts`（第五章手写规则、MDT、结局档位）
- 横版场景的走动与交互：`src/components/Explore.tsx`

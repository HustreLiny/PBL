# Suno BGM 提示词与放置方式

两首都请使用 **Instrumental / 纯音乐**，下载 MP3 后按下面的文件名保存。游戏和宣传片的音量已经在代码里压低，给文字阅读和操作音效留出空间。

## 1. 游戏内循环 BGM

保存为：`game/public/audio/game-bgm.mp3`

建议生成 2 分钟左右；最好选择开头和结尾节拍相近、没有明显终止式的一版，循环会更自然。

### Suno 提示词

```text
Instrumental seamless-loop background music for a Chinese medical PBL clinical reasoning game. Quiet investigative momentum, humane rather than cold, subtle tension without horror. 104 BPM, A minor with touches of Dorian warmth. Soft analog synth pulse, restrained marimba and prepared-piano notes, muted electric bass, light brushed electronic percussion, faint warm pads, a tiny hint of tasteful 16-bit game texture. Keep the melody sparse and memorable but never dominant; steady low dynamics for reading dialogue, reviewing lab data, taking notes, and building a clinical report. No dramatic drops, no big ending, end on an open sustained groove that can loop back to the first bar. Clean, modern, focused, compassionate, medical mystery atmosphere. No vocals.
```

### Styles to exclude / 负面约束

```text
vocals, choir, lyrics, horror, jump scare, siren, literal ECG beeps, hospital alarm, epic trailer, orchestral bombast, heavy rock, EDM drop, busy lead melody, comedy, cute children music, sad piano ballad, abrupt ending
```

## 2. 宣传片 BGM

保存为：`game/public/audio/promo-bgm.mp3`

宣传片长 64 秒。生成 60–90 秒均可；录制脚本会自动截到 64 秒并淡出。节拍建议固定为 120 BPM，这样每个 4/4 小节正好 2 秒，比较容易贴合镜头。

### Suno 提示词

```text
Instrumental 64-second promotional cue for a pixel-art Chinese medical PBL clinical reasoning game, 120 BPM, 4/4, cinematic electronic pulse with subtle 16-bit texture, intelligent and humane rather than heroic. Follow a clear arc: first 5 seconds sparse urgent clinical tension; seconds 5–11 reveal the title and the four-step gameplay loop; seconds 11–38 build focused forward motion for interviewing, collecting lab data, taking analytical notes, and submitting an evidence-backed report; seconds 38–43 soften briefly for a sensitive patient communication choice; seconds 43–55 rise with broader multi-chapter and multidisciplinary-team energy; seconds 55–64 resolve into a confident, warm invitation with a clean final sustain. Use tight electronic percussion, muted bass, warm analog pads, restrained piano or marimba accents, and a simple memorable three-note motif. Leave room for UI sound effects. No vocals, no spoken words, no literal medical alarms.
```

### Styles to exclude / 负面约束

```text
vocals, lyrics, rap, choir, horror, siren, ECG beep, hospital alarm, blockbuster braam, superhero, military, heavy metal, EDM festival drop, sentimental ballad, comedy, overly busy melody, long ambient intro, fade-in longer than two seconds
```

## 使用

- 游戏：放入 `game-bgm.mp3` 后，玩家点击右上角的“BGM 关”即可播放或暂停。浏览器要求用户主动点击后才能发声。
- 宣传片：放入 `promo-bgm.mp3` 后运行 `npm run promo`，脚本会自动使用它并保留原有界面音效；文件不存在时会回退到内置合成配乐。
- 临时试别的文件：`npm run promo -- --bgm=你的音频路径`。相对路径从 `game/` 目录计算。

import { useEffect } from 'react';

/** 美术素材的来源；换上正式美术后改这一行 */
const ART_CREDIT = '当前为占位图，正式美术制作中。';

export function About({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="modal about pixel-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="pixel">关于</h2>
        <p>妊娠黄疸 PBL · 版本 {__APP_VERSION__}</p>
        <p>单人互动推理游戏：跟着一份真实的教学病例接诊、调查，并向上级汇报。</p>
        <ul>
          <li>病例改编自医学院的 PBL 教学病例。病程和检查结果依照原病例，不因玩家的选择而改变。</li>
          <li>刘主任、师姐等人物和对白是虚构的，不指代真实的医护人员。</li>
          <li>本游戏仅供医学教学使用，不构成任何诊疗建议。</li>
        </ul>
        <h3 className="pixel">字体</h3>
        <ul>
          <li>
            霞鹜文楷屏幕阅读版（LXGW WenKai Screen），
            <a href="/fonts/lxgw-wenkai-screen-OFL.txt" target="_blank" rel="noreferrer">
              SIL Open Font License 1.1
            </a>
          </li>
          <li>
            缝合像素字体（Fusion Pixel Font），
            <a href="/fonts/fusion-pixel-OFL.txt" target="_blank" rel="noreferrer">
              SIL Open Font License 1.1
            </a>
          </li>
        </ul>
        <h3 className="pixel">美术</h3>
        <p>{ART_CREDIT}</p>
        <button className="primary" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}

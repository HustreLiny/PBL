import { useEffect, useState } from 'react';

const QUERY = '(max-width: 700px), (max-height: 480px)';
const DISMISSED = 'pbl-small-screen-ok';

/** 手机不在支持范围：屏幕太小时提示一下，玩家可以选择继续 */
export function SmallScreen() {
  const [small, setSmall] = useState(() => matchMedia(QUERY).matches);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED) === '1');

  useEffect(() => {
    const m = matchMedia(QUERY);
    const onChange = () => setSmall(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  if (!small || dismissed) return null;
  return (
    <div className="modal-layer">
      <div className="modal small-screen pixel-border">
        <p>这个游戏按电脑和平板设计，在手机上画面和文字会挤在一起。建议换用电脑或平板打开。</p>
        <button
          className="primary"
          onClick={() => {
            sessionStorage.setItem(DISMISSED, '1');
            setDismissed(true);
          }}
        >
          仍然继续
        </button>
      </div>
    </div>
  );
}

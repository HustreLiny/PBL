import { useState } from 'react';

// 美术占位：放入 public/art/<slot>.png 即自动替换。原始尺寸按像素规格，整数倍放大显示。
export const ART_SIZE = {
  scene: { w: 480, h: 270 },
  portrait: { w: 96, h: 128 },
};

interface Props {
  slot: string;
  label: string;
  kind: 'scene' | 'portrait';
  scale?: number;
  mood?: string;
}

export function Art({ slot, label, kind, scale = kind === 'scene' ? 2 : 1, mood }: Props) {
  const [failed, setFailed] = useState(false);
  const { w, h } = ART_SIZE[kind];
  const style = { width: w * scale, maxWidth: '100%', aspectRatio: `${w} / ${h}` };
  if (!failed) {
    return (
      <img
        className="art pixelated"
        src={`/art/${slot}.png`}
        alt={label}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`art placeholder ${kind}`} style={style} role="img" aria-label={label}>
      <span className="pixel">{label}</span>
      {mood && <small className="mood">{mood}</small>}
    </div>
  );
}

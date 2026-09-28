import { useEffect, useRef, useState } from 'react';

const BGM_URL = '/audio/game-bgm.mp3';

type Status = 'off' | 'loading' | 'playing' | 'missing';

/**
 * 浏览器不允许网页无交互自动播放，因此由玩家主动开启。
 * 音频文件尚未放入时保持可用的无声状态，不影响游戏和构建。
 */
export function BgmControl() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<Status>('off');

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  const toggle = async () => {
    const current = audioRef.current;
    if (status === 'playing' && current) {
      current.pause();
      setStatus('off');
      return;
    }

    const audio = current ?? new Audio(BGM_URL);
    if (!current) {
      audio.loop = true;
      audio.preload = 'none';
      audio.volume = 0.32;
      audioRef.current = audio;
    }
    setStatus('loading');
    try {
      await audio.play();
      setStatus('playing');
    } catch {
      setStatus('missing');
    }
  };

  const label =
    status === 'playing' ? '♫ BGM 开' : status === 'loading' ? '♪ 加载中' : status === 'missing' ? '♪ BGM 待放入' : '♪ BGM 关';

  return (
    <button
      className={`small bgm-control ${status}`}
      aria-pressed={status === 'playing'}
      title={status === 'missing' ? '请将音乐保存为 public/audio/game-bgm.mp3' : '开启或暂停背景音乐'}
      onClick={toggle}
    >
      {label}
    </button>
  );
}

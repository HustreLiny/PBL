import { useEffect } from 'react';
import { useGame } from '../ctx';
import { Art } from './Art';
import { sumLedger } from '../state';
import type { Speaker } from '../data/story';

export const PORTRAIT: Partial<Record<Speaker, string>> = {
  师姐: 'portrait-senior',
  刘主任: 'portrait-liu',
  患者: 'portrait-patient',
  家属: 'portrait-family',
  护士: 'portrait-nurse',
  血液科: 'portrait-hema',
  ICU: 'portrait-icu',
  消化科: 'portrait-gi',
  产科: 'portrait-ob',
  风湿免疫科: 'portrait-rheum',
};

/** 患者评价只通过表情体现，不显示数字 */
export function patientMood(score: number): string {
  if (score >= 3) return '放松';
  if (score >= 0) return '谨慎';
  return '不安';
}

export function DialogBox() {
  const { s, d } = useGame();
  const line = s.dialog[0];
  const open = !!line;

  // 对话出现时取消按钮焦点，免得回车再次触发刚点过的选项
  useEffect(() => {
    if (open) (document.activeElement as HTMLElement | null)?.blur?.();
  }, [open]);

  useEffect(() => {
    if (!open || s.help) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !['Enter', ' ', 'e', 'E'].includes(e.key)) return;
      e.preventDefault();
      d({ t: 'dialogNext' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, s.help, d]);

  if (!line) return null;
  const slot = PORTRAIT[line.who];
  const mood = line.who === '患者' || line.who === '家属' ? patientMood(sumLedger(s.ledger).patient) : undefined;
  const item = line.item;
  const got = item ? s.collected.includes(item.id) : false;
  return (
    <div className="dialog-layer" onClick={() => d({ t: 'dialogNext' })}>
      <div className="dialog pixel-border">
        {slot && <Art slot={slot} label={line.who} kind="portrait" mood={mood} />}
        <div className="dialog-body">
          {line.who !== '旁白' && <div className="speaker pixel">{line.who}</div>}
          {item ? (
            <p
              className={got ? 'info-line got' : 'info-line'}
              onClick={(e) => {
                e.stopPropagation();
                d({ t: 'collect', id: item.id });
              }}
            >
              {line.text}
              <span className="info-tag">{got ? '已收入信息板' : '点击收入信息板'}</span>
            </p>
          ) : (
            <p className={line.who === '旁白' ? 'narration' : ''}>{line.text}</p>
          )}
          <div className="continue pixel">▼ 点击空白处或按回车继续</div>
        </div>
      </div>
    </div>
  );
}

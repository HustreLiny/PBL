import { useGame } from '../ctx';
import { CHAPTERS } from '../data/chapters';
import { sumLedger } from '../state';
import { Art } from './Art';
import { patientMood } from './DialogBox';

export function Talk() {
  const { s, d } = useGame();
  const talk = CHAPTERS[s.chapter].talk;
  const node = talk?.nodes[s.talkNode];
  const mood = patientMood(sumLedger(s.ledger).patient);
  if (!talk || !node) return null;
  return (
    <div className="talk">
      <h2 className="pixel">{talk.title}</h2>
      <div className="talk-stage">
        <Art slot="portrait-patient" label="患者" kind="portrait" mood={mood} />
        <Art slot="portrait-family" label="家属" kind="portrait" mood={mood} />
      </div>
      <div className="talk-prompt pixel-border-thin">
        {node.prompt.map((l, i) => (
          <p key={i} className={l.who === '旁白' ? 'narration' : ''}>
            {l.who !== '旁白' && <b>{l.who}：</b>}
            {l.text}
          </p>
        ))}
      </div>
      <div className="options">
        {node.options.map((o, i) => (
          <button
            key={i}
            className="option"
            onClick={() =>
              d({
                t: 'talk',
                choice: i,
                patient: o.patient,
                clinical: o.clinical,
                lines: [{ who: '你', text: o.text }, ...o.replies],
              })
            }
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

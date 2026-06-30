import { Audio, Sequence, staticFile } from "remotion";
import marksData from "./marks.json";

type Mark = { t: number; title: string; sub: string };

// Nota: la cama de música (pad ambiente) se mezcla en post con ffmpeg (ver make-final.sh),
// porque el promo no tenía pista de música real. Acá van solo los SFX sincronizados.

// Un SFX disparado en un frame puntual
const Sfx: React.FC<{ from: number; src: string; vol?: number }> = ({ from, src, vol = 0.6 }) => (
  <Sequence from={Math.max(0, from)} durationInFrames={26} layout="none">
    <Audio src={staticFile(src)} volume={vol} />
  </Sequence>
);

// SFX de las slides (transiciones + cada card que aparece)
const SLIDE_SFX = [
  { f: 4, src: "chime.wav", vol: 0.5 },
  { f: 96, src: "whoosh.wav", vol: 0.6 },
  { f: 114, src: "pop.wav", vol: 0.5 },
  { f: 128, src: "pop.wav", vol: 0.5 },
  { f: 142, src: "pop.wav", vol: 0.5 },
  { f: 258, src: "whoosh.wav", vol: 0.6 },
  { f: 276, src: "pop.wav", vol: 0.5 },
  { f: 290, src: "pop.wav", vol: 0.5 },
  { f: 304, src: "pop.wav", vol: 0.5 },
  { f: 420, src: "whoosh.wav", vol: 0.6 },
];

// SFX del demo: un sonido en cada acción (según las marcas), chime en los hitos
const SUCCESS = ["Acreditado", "Quote real", "SEP-24 — flujo hosted", "QR del split listo", "QR interoperable"];
const DEMO_SFX = (marksData as Mark[]).map((m) => {
  const f = 420 + Math.round((m.t / 1000) * 30);
  const success = SUCCESS.some((s) => m.title.includes(s));
  return { f, src: success ? "chime.wav" : "pop.wav", vol: success ? 0.42 : 0.5 };
});

export const AudioLayer: React.FC = () => {
  return (
    <>
      {[...SLIDE_SFX, ...DEMO_SFX].map((s, i) => (
        <Sfx key={i} from={s.f} src={s.src} vol={s.vol} />
      ))}
    </>
  );
};

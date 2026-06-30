import {
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { PhoneDemo } from "./Demo";
import { AudioLayer } from "./AudioLayer";

const C = {
  deep: "#0B0E14",
  indigo: "#5B4BF5",
  indigoDark: "#3D2FD6",
  violet: "#8B7CF8",
  teal: "#2DD4BF",
  amber: "#FFB020",
  slate: "#94A3B8",
};

const FONT = 'Geist, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const gradText = {
  backgroundImage: `linear-gradient(90deg, ${C.indigo}, ${C.teal})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

// Fondo de patrón de flechas (motivo del logo) + viñeta — igual que el front
const ArrowBg: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.deep }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id="arrows" width={176} height={128} patternUnits="userSpaceOnUse">
          <g stroke={C.indigo} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.13}>
            <path d="M34 50 H96" />
            <path d="M84 38 L100 50 L84 62" />
            <path d="M104 78 H42" />
            <path d="M54 66 L38 78 L54 90" />
          </g>
        </pattern>
        <radialGradient id="vig" cx="50%" cy="36%" r="72%">
          <stop offset="0%" stopColor="#1a2138" stopOpacity={0.65} />
          <stop offset="100%" stopColor={C.deep} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#arrows)" />
      <rect width="100%" height="100%" fill="url(#vig)" />
    </svg>
  </AbsoluteFill>
);

const Fade: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({ durationInFrames, children }) => {
  const f = useCurrentFrame();
  const opIn = interpolate(f, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opOut = interpolate(f, [durationInFrames - 14, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(opIn, opOut) }}>{children}</AbsoluteFill>;
};

const fadeUp = (f: number, start: number, dur = 18) => {
  const o = interpolate(f, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const y = interpolate(f, [start, start + dur], [44, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return { opacity: o, transform: `translateY(${y}px)` };
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: C.teal, fontSize: 30, fontWeight: 700, letterSpacing: 8, textTransform: "uppercase" }}>{children}</div>
);

// ── Intro ───────────────────────────────────────────────
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 16, mass: 0.8 } });
  const scale = interpolate(s, [0, 1], [0.82, 1]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90, textAlign: "center" }}>
      <Img src={staticFile("passpay-logo.svg")} style={{ width: 560, transform: `scale(${scale})` }} />
      <div style={{ height: 70 }} />
      <div style={{ ...fadeUp(f, 14), fontSize: 76, fontWeight: 900, color: "#fff", lineHeight: 1.08 }}>
        Cobrá en pesos.
        <br />
        <span style={gradText}>Ahorrá en dólares.</span>
      </div>
      <div style={{ ...fadeUp(f, 26), marginTop: 34, fontSize: 38, color: C.slate }}>
        Simple. Rápido. <span style={{ color: C.teal, fontWeight: 600 }}>Sobre Stellar.</span>
      </div>
    </AbsoluteFill>
  );
};

// ── Card genérica ───────────────────────────────────────
const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 32,
      width: 880,
      padding: "38px 44px",
      borderRadius: 36,
      border: "1.5px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.04)",
      ...style,
    }}
  >
    {children}
  </div>
);

// Badge con glifo + gradiente (renderiza consistente, sin depender de emoji)
const Badge: React.FC<{ glyph: string; color: string }> = ({ glyph, color }) => (
  <div
    style={{
      width: 92,
      height: 92,
      borderRadius: 26,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 52,
      fontWeight: 900,
      color: "#0B0E14",
      backgroundImage: `linear-gradient(135deg, ${color}, ${C.indigoDark})`,
    }}
  >
    {glyph}
  </div>
);

// ── Problema ────────────────────────────────────────────
const PROBLEMA = [
  { glyph: "$", color: C.teal, title: "Cobrás en pesos", sub: "Transferencias 3.0: QR interoperable, instantáneo, 24/7." },
  { glyph: "↓", color: C.amber, title: "El peso se devalúa", sub: "La demanda de dólar es de las más altas del mundo." },
  { glyph: "⇄", color: C.violet, title: "No hay puente", sub: "Pasar pesos a dólares (y volver) es pura fricción." },
];

const Problema: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
      <div style={{ ...fadeUp(f, 0), textAlign: "center", marginBottom: 64 }}>
        <Label>El problema</Label>
        <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", marginTop: 18, lineHeight: 1.05 }}>
          Dos realidades <span style={gradText}>a la vez</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {PROBLEMA.map((p, i) => (
          <Card key={p.title} style={fadeUp(f, 18 + i * 14)}>
            <Badge glyph={p.glyph} color={p.color} />
            <div>
              <div style={{ fontSize: 46, fontWeight: 800, color: "#fff" }}>{p.title}</div>
              <div style={{ fontSize: 32, color: C.slate, marginTop: 8 }}>{p.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Solución ────────────────────────────────────────────
const SOLUCION = [
  { n: "1", title: "Cobrás con QR", sub: "Transferencias 3.0, el de siempre", color: C.teal },
  { n: "2", title: "Liquidás en dólares", sub: "On-chain en Stellar, en segundos", color: C.indigo },
  { n: "3", title: "Retirás a pesos", sub: "A tu cuenta, cuando quieras", color: C.amber },
];

const Solucion: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
      <div style={{ ...fadeUp(f, 0), textAlign: "center", marginBottom: 64 }}>
        <Label>La solución</Label>
        <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", marginTop: 18, lineHeight: 1.05 }}>
          Cobrá en pesos.
          <br />
          <span style={gradText}>Liquidá en dólares.</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {SOLUCION.map((s, i) => (
          <Card key={s.n} style={fadeUp(f, 18 + i * 14)}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 26,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 50,
                fontWeight: 900,
                color: "#0B0E14",
                backgroundImage: `linear-gradient(135deg, ${s.color}, ${C.indigoDark})`,
              }}
            >
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: 46, fontWeight: 800, color: "#fff" }}>{s.title}</div>
              <div style={{ fontSize: 32, color: C.slate, marginTop: 8 }}>{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Composición ─────────────────────────────────────────
// Slides (intro · problema · solución) → demo en marco de teléfono. Todo Remotion.
export const Pitch: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <ArrowBg />
      <AudioLayer />
      <Sequence durationInFrames={96}>
        <Fade durationInFrames={96}>
          <Intro />
        </Fade>
      </Sequence>
      <Sequence from={96} durationInFrames={162}>
        <Fade durationInFrames={162}>
          <Problema />
        </Fade>
      </Sequence>
      <Sequence from={258} durationInFrames={162}>
        <Fade durationInFrames={162}>
          <Solucion />
        </Fade>
      </Sequence>
      <Sequence from={420} durationInFrames={2460}>
        <Fade durationInFrames={2460}>
          <PhoneDemo />
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
};

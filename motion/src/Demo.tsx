import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import marksData from "./marks.json";

const C = { deep: "#0B0E14", indigo: "#5B4BF5", teal: "#2DD4BF", slate: "#94A3B8" };

type Mark = { t: number; title: string; sub: string };

// Limpia "N · " del título y reetiqueta el home
const CAPTIONS = (marksData as Mark[]).map((m) => ({
  t: m.t,
  title: m.title === "Passpay" ? "Passpay — la app" : m.title.replace(/^\d+\s·\s/, ""),
  sub: m.sub,
}));

// Escena del demo: grabación real dentro de un marco de teléfono + subtítulos sincronizados.
export const PhoneDemo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tMs = (f / fps) * 1000;

  // caption activa = última marca cuyo t <= tiempo actual
  let idx = 0;
  for (let i = 0; i < CAPTIONS.length; i++) if (CAPTIONS[i].t <= tMs + 1) idx = i;
  const cur = CAPTIONS[idx];
  const capOp = interpolate(tMs - cur.t, [0, 260], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const SCREEN_W = 560;
  const SCREEN_H = 1050;
  const BEZEL = 26;
  const DEV_W = SCREEN_W + BEZEL * 2;
  const DEV_H = SCREEN_H + BEZEL * 2;

  return (
    <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* título */}
      <div style={{ color: "#fff", fontSize: 42, fontWeight: 800, marginBottom: 34 }}>
        Demo <span style={{ color: C.teal }}>en vivo</span>
      </div>

      {/* teléfono */}
      <div
        style={{
          width: DEV_W,
          height: DEV_H,
          borderRadius: 66,
          background: "#0f1320",
          border: "2px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55), 0 0 70px rgba(91,75,245,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: BEZEL + 9,
            width: 156,
            height: 26,
            borderRadius: 16,
            background: C.deep,
            zIndex: 2,
          }}
        />
        {/* pantalla */}
        <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 42, overflow: "hidden", background: C.deep }}>
          <OffthreadVideo
            src={staticFile("demo.mp4")}
            muted
            style={{ width: SCREEN_W, height: SCREEN_H, objectFit: "cover" }}
          />
        </div>
      </div>

      {/* subtítulo sincronizado */}
      <div style={{ marginTop: 42, textAlign: "center", maxWidth: 940, opacity: capOp, paddingLeft: 60, paddingRight: 60 }}>
        <div style={{ fontSize: 50, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{cur.title}</div>
        {cur.sub ? <div style={{ fontSize: 32, color: C.slate, marginTop: 12 }}>{cur.sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

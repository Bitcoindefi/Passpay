// Arma una pista de SFX (pop/chime) colocada en los tiempos exactos. SIN whoosh.
import { readFileSync, writeFileSync } from "node:fs";

const SR = 48000, CH = 2, SECONDS = 104.5, N = Math.floor(SR * SECONDS) * CH;
const buf = new Float32Array(N);

function loadWav(path) {
  const b = readFileSync(path);
  let off = 12;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const sz = b.readUInt32LE(off + 4);
    if (id === "data") {
      const start = off + 8, samples = Math.floor(sz / 2);
      const f = new Float32Array(samples);
      for (let i = 0; i < samples; i++) f[i] = b.readInt16LE(start + i * 2) / 32768;
      return f; // interleaved estéreo
    }
    off += 8 + sz + (sz & 1);
  }
  throw new Error("no data chunk: " + path);
}

const pop = loadWav("public/pop.wav");
const chime = loadWav("public/chime.wav");

function place(samples, atSec, gain) {
  const start = Math.floor(atSec * SR) * CH;
  for (let i = 0; i < samples.length; i++) {
    const idx = start + i;
    if (idx >= 0 && idx < N) buf[idx] += samples[i] * gain;
  }
}

// SFX de slides: cards (pop) + chime de intro. Whoosh EXCLUIDO.
const SLIDE = [
  { f: 4, src: "chime" },
  { f: 114, src: "pop" }, { f: 128, src: "pop" }, { f: 142, src: "pop" },
  { f: 276, src: "pop" }, { f: 290, src: "pop" }, { f: 304, src: "pop" },
];
for (const e of SLIDE) place(e.src === "chime" ? chime : pop, e.f / 30, e.src === "chime" ? 0.85 : 1.0);

// SFX del demo: pop por acción, chime en hitos. Demo arranca en frame 420 = 14s.
const marks = JSON.parse(readFileSync("src/marks.json", "utf8"));
const SUCCESS = ["Acreditado", "Quote real", "SEP-24 — flujo hosted", "QR del split listo", "QR interoperable"];
for (const m of marks) {
  const t = 14 + m.t / 1000;
  const success = SUCCESS.some((s) => m.title.includes(s));
  place(success ? chime : pop, t, success ? 0.85 : 1.0);
}

// normalizar a -1 dBFS aprox
let max = 1e-6;
for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(buf[i]));
const g = Math.min(1, 0.9 / max);

const out = Buffer.alloc(44 + N * 2);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVE", 8);
out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(CH, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * CH * 2, 28); out.writeUInt16LE(CH * 2, 32); out.writeUInt16LE(16, 34);
out.write("data", 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, buf[i] * g));
  out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}
writeFileSync("out/sfx.wav", out);
console.log("sfx.wav:", SLIDE.length, "slide +", marks.length, "demo events (sin whoosh)");

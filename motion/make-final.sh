#!/usr/bin/env bash
# Pipeline del video de pitch: slides Remotion + demo en marco de teléfono + audio (música + SFX).
# En máquinas con proxy TLS: prefijar con NODE_TLS_REJECT_UNAUTHORIZED=0 y exportar CHROME=<ruta a chrome>.
set -e
CHROME="${CHROME:-}"
SONG="${SONG:-../docs/demo/Jamie Bathgate - Status.mp3}"   # música de fondo (no se versiona; ver README)

# 1) Video (sin audio): slides + demo en teléfono. Necesita public/demo.mp4 (grabar con
#    docs/demo/record-demo.js → convertir a public/demo.mp4 h264 sin audio) y public/{pop,chime}.wav
npx remotion render Pitch out/render.mp4 --codec=h264 --crf=22 --muted --concurrency=6 ${CHROME:+--browser-executable="$CHROME"}

# 2) Cama de música: saltea las partes con voz del track ([0-9] + [13-29] + [35-107]) con crossfades
ffmpeg -y -i "$SONG" -filter_complex "\
[0:a]atrim=0:9,asetpts=N/SR/TB[a0];\
[0:a]atrim=13:29,asetpts=N/SR/TB[a1];\
[0:a]atrim=35:107,asetpts=N/SR/TB[a2];\
[a0][a1]acrossfade=d=0.35[x];[x][a2]acrossfade=d=0.35[bed]" -map "[bed]" -ar 48000 -ac 2 out/bed.wav

# 3) Pista de SFX (pop/chime en cada card y acción del demo; SIN whoosh) — sincronizada por marks.json
node build-sfx.mjs

# 4) Mezclar música + SFX, normalizar loudness, y muxear con el video
ffmpeg -y -i out/bed.wav -i out/sfx.wav \
  -filter_complex "[0:a]volume=0.6,afade=t=out:st=93:d=3[mus];[1:a]volume=1.5[sfx];[mus][sfx]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[a]" -ar 48000 -ac 2 out/finalaudio.m4a
ffmpeg -y -i out/render.mp4 -i out/finalaudio.m4a -map 0:v -map 1:a -shortest \
  -c:v copy -c:a aac -b:a 192k ../docs/demo/passpay-pitch.mp4

echo "OK → ../docs/demo/passpay-pitch.mp4"

#!/usr/bin/env bash
# Pipeline completo del video de pitch (slides Remotion + demo en marco de teléfono + audio).
# En máquinas con proxy TLS: prefijar con NODE_TLS_REJECT_UNAUTHORIZED=0 y pasar --browser-executable.
set -e
CHROME="${CHROME:-}"   # opcional: ruta a chrome para Remotion

# 1) Render Remotion (slides + demo en teléfono + SFX sincronizados). Necesita public/demo.mp4
#    (grabar con docs/demo/record-demo.js) y public/{pop,whoosh,chime}.wav
npx remotion render Pitch out/pitch.mp4 --codec=h264 --crf=22 --concurrency=6 ${CHROME:+--browser-executable="$CHROME"}

# 2) Pad ambiente (acorde Do mayor, suave) como cama de fondo — el promo no tenía música real
ffmpeg -y \
  -f lavfi -i "sine=frequency=130.81:duration=103" -f lavfi -i "sine=frequency=196:duration=103" \
  -f lavfi -i "sine=frequency=261.63:duration=103" -f lavfi -i "sine=frequency=329.63:duration=103" \
  -filter_complex "[0][1][2][3]amix=inputs=4,tremolo=f=0.12:d=0.25,lowpass=f=850,aecho=0.8:0.5:55:0.3,afade=t=in:st=0:d=3,afade=t=out:st=99:d=4[a]" \
  -map "[a]" -ar 48000 -ac 2 out/pad.wav

# 3) Mezclar SFX(render) + pad, normalizar loudness (-15 LUFS) y muxear
ffmpeg -y -i out/pitch.mp4 -i out/pad.wav \
  -filter_complex "[0:a]volume=16[sfx];[1:a]volume=0.5[pad];[sfx][pad]amix=inputs=2:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k ../docs/demo/passpay-pitch.mp4

echo "OK → ../docs/demo/passpay-pitch.mp4"

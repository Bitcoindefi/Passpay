# Passpay — Motion (Remotion)

Slides de **Problema / Solución** (intro + 2 escenas) en el estilo del front
(fondo de flechas, gradiente indigo→teal, cards), hechas con [Remotion](https://remotion.dev).
Se anteponen al screen-recording del demo para armar el video de pitch.

Salida final: [`../docs/demo/passpay-pitch.mp4`](../docs/demo/passpay-pitch.mp4) (slides + demo, ~97s).

## Correr

```bash
cd motion
npm install
npm run studio          # preview en Remotion Studio
```

## Render

```bash
# 1) renderizar solo las slides (1080x1920, 14s)
npx remotion render Slides out/slides.mp4 --codec=h264

# 2) ajustar el demo a 1080x1920 y concatenar con crossfade (necesita el screen-recording)
#    el screen-recording se genera con docs/demo/record-demo.js (Playwright contra el sitio deployado)
ffmpeg -i ../docs/demo/demo.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0B0E14,fps=30,setsar=1,format=yuv420p" -c:v libx264 -crf 21 -an out/demo_fit.mp4
ffmpeg -i out/slides.mp4 -i out/demo_fit.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=13.5,format=yuv420p[v]" -map "[v]" -c:v libx264 -crf 22 -movflags +faststart out/passpay-pitch.mp4
```

> En máquinas con proxy TLS: prefijar los comandos `npx remotion` con `NODE_TLS_REJECT_UNAUTHORIZED=0`
> y pasar `--browser-executable=<ruta a chrome>` si Remotion no puede descargar el navegador.

## Editar

- `src/Slides.tsx` — las 3 escenas (Intro, Problema, Solución) + el fondo de flechas y los estilos de marca.
- `src/Root.tsx` — dimensiones/fps/duración de la composición.

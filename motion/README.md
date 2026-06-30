# Passpay — Motion (Remotion)

Video de pitch **todo en Remotion**, en el estilo del front (fondo de flechas, gradiente
indigo→teal, cards):

1. **Intro · Problema · Solución** — slides animadas ([`src/Slides.tsx`](src/Slides.tsx)).
2. **Demo** — la grabación real de la app dentro de un **marco de teléfono**, con subtítulos
   sincronizados a cada flujo ([`src/Demo.tsx`](src/Demo.tsx), tiempos en `src/marks.json`).
3. **Audio** — SFX sincronizados (whoosh en transiciones, pop en cada card/acción, chime en hitos:
   [`src/AudioLayer.tsx`](src/AudioLayer.tsx)) + una cama de pad ambiente mezclada en post.

Salida: [`../docs/demo/passpay-pitch.mp4`](../docs/demo/passpay-pitch.mp4) (~103s, 1080×1920).

## Correr / render

```bash
cd motion
npm install
npm run studio                 # preview

# generar el demo embebido (grabación real de la app deployada)
node ../docs/demo/record-demo.js   # → produce el webm; convertir a public/demo.mp4 (h264, sin audio)

# render + audio (todo el pipeline)
bash make-final.sh             # render Remotion + pad + mezcla + loudnorm → ../docs/demo/passpay-pitch.mp4
```

> En máquinas con proxy TLS: prefijar `npx`/`node` con `NODE_TLS_REJECT_UNAUTHORIZED=0` y exportar
> `CHROME=<ruta a chrome>` para que Remotion no tenga que descargar el navegador.

## Assets
- `public/demo.mp4` — grabación de pantalla (gitignored; regenerar con `record-demo.js`).
- `public/{pop,whoosh,chime}.wav` — SFX sintetizados con ffmpeg.
- `public/passpay-logo.svg` — logo.
- El **pad de música** se sintetiza en `make-final.sh` (el promo no tenía pista de audio real).

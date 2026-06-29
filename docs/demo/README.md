# Demo en video — Passpay

`passpay-flows.webm` es una grabación automatizada (Playwright) de los flujos reales de Passpay
corriendo contra el backend en vivo. ~1 min, con subtítulos y portada de intro.

## Qué muestra
0. **Portada** — intro de marca (3.5 s) antepuesta con ffmpeg.
1. **Home + panel del comercio** — home rediseñado (paleta indigo→teal, íconos del set) y el
   dashboard: balance en dólares ↔ pesos (1 USD ≈ AR$ 1.175) y timeline de movimientos.
2. **Cobro en pesos (QR)** — monto → QR de cobro que escanea cualquier billetera/banco → simular
   pago del cliente → pago acreditado, guardado en dólares. (Flujo completo end-to-end.)
3. **Pasar dólares a pesos (BlindPay)** — selector de destino (Argentina activo · Brasil/Colombia
   pronto) → crear cuenta en pesos (CBU) → **cotización real** contra el sandbox de BlindPay
   (50 USDC → ~76.300 ARS). Se graba hasta el paso de confirmar con la billetera.
4. **Comprar y vender dólares** — proveedor de cambio descubierto y listo para operar.

> Los flujos que firman con wallet (`/offramp`, `/pay`) se graban hasta el paso de la firma: el
> popup de Freighter/xBull es externo al navegador y no se automatiza.

## Regenerar el video
```bash
# 1. levantar backend y frontend
cd api && npm run dev          # :3001  (necesita api/.env con credenciales)
cd frontend && npm run dev     # :3000  (NEXT_PUBLIC_API_URL=http://localhost:3001)

# 2. instalar Playwright (una vez)
npm i -D playwright && npx playwright install chromium

# 3. grabar
node docs/demo/record-demo.js
# salida: docs/demo/videos/*.webm

# 4. anteponer la portada de intro (3.5 s) y recomprimir
ffmpeg -loop 1 -t 3.5 -i frontend/public/passpay-cover.png -i docs/demo/videos/<rec>.webm \
  -filter_complex "[0:v]scale=480:900:force_original_aspect_ratio=decrease,pad=480:900:(ow-iw)/2:(oh-ih)/2:color=0x0B0E14,setsar=1,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=3.0:d=0.5[intro];[1:v]scale=480:900,setsar=1,format=yuv420p[body];[intro][body]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -c:v libvpx-vp9 -crf 37 -b:v 0 -an docs/demo/passpay-flows.webm
```

Variables opcionales: `DEMO_BASE_URL` (default `http://localhost:3000`), `CHROMIUM_PATH`
(ruta a un chromium ya instalado).

> Para grabar contra el deploy en vivo (sin levantar servers locales):
> `DEMO_BASE_URL=https://passpay-one.vercel.app node docs/demo/record-demo.js`

## Convertir a mp4 (para subir al pitch)
El webm reproduce en cualquier browser/VLC. Para mp4, con un ffmpeg completo:
```bash
ffmpeg -i passpay-flows.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart passpay-flows.mp4
```

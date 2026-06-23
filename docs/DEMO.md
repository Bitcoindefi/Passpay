# Passpay — Guión de demo (video 1–2 min)

Objetivo: mostrar el prototipo funcionando y el problema real que resuelve. No hace falta ser técnico ni salir en cámara.

## Preparación
1. Backend: `cd api && cp .env.example .env && npm install && npx prisma generate && npm run dev`
   - Setear `PASSPAY_SECRET` y `MERCHANT_PUBLIC` con una cuenta testnet fondeada ([friendbot](https://friendbot.stellar.org)).
   - `ANCHOR_PROVIDER=reference` (anchor de referencia SDF, siempre disponible).
   - `T3_SETTLE_ASSET_CODE=XLM` (settlement nativo, robusto para demo).
2. Frontend: `cd frontend && npm install && npm run dev` → http://localhost:3000

---

## Escena 1 — El gancho (0:00–0:15)
Texto en pantalla / voz:
> "En Argentina cobrás en pesos por Transferencias 3.0, pero querés ahorrar en dólares. Passpay une las dos cosas."

Mostrar la **home** de Passpay (logo, dos accesos: Cobrar en ARS · Rampa dólar).

## Escena 2 — Cobro en ARS → dólar on-chain (0:15–0:55)
1. Entrar a **Cobrar en ARS** (`/cobrar-ars`).
2. Ingresar un monto (ej. `15000`) → **Generar QR interoperable**.
3. Señalar: *"Este es un QR Transferencias 3.0 real, formato EMVCo — lo lee cualquier billetera o banco del esquema."* (mostrar el string EMV abajo).
4. Click **Simular pago del cliente**.
5. Pantalla de éxito: acreditación Coelsa + **"Liquidado on-chain"** con el hash.
6. Abrir el link a **Stellar Expert** → mostrar la transacción real en la red.

> Mensaje: "El cliente pagó en pesos. El comercio recibió valor on-chain. En segundos."

## Escena 3 — Rampa dólar (SEP-24) (0:55–1:30)
1. Entrar a **Rampa** (`/ramp`).
2. Mostrar el anchor conectado (`GET /anchor/info`).
3. Elegir **Cobrar en ARS / off-ramp** (o fondear), click → se abre el **flujo hosted del anchor (SEP-24)**.
4. Señalar el polling de estado en vivo.

> Mensaje: "On/off-ramp dólar ↔ peso con un anchor real, vía estándares SEP de Stellar."

## Escena 4 — Cierre (1:30–1:45)
Texto:
> "Passpay: el peso entra por el rail de siempre, el dólar sale on-chain. Open source, sobre Stellar."

Mostrar el repo y el logo.

---

## Tomas de respaldo (si algo falla en vivo)
- `curl localhost:3001/anchor/info` y `POST /transferencias3/qr` para mostrar las respuestas reales.
- Captura previa de una tx en Stellar Expert.

# Passpay — Handoff del equipo
> Pitch Day PULSO Argentina · Stellar Integration Track · **6 de julio 2026**
> Branch: `main` — todo lo de abajo está mergeado y corriendo.

---

## Estado actual (lo que ya funciona)

| Módulo | Estado | Cómo probarlo |
|---|---|---|
| Rebrand completo Migo→Passpay | ✅ merged | `cd frontend && npm run dev` → http://localhost:3000 |
| Transferencias 3.0 / QR EMVCo | ✅ merged | `POST /transferencias3/qr {"amountArs":15000}` |
| Anchor SEP-24 (SDF testnet) | ✅ merged, validado e2e | `GET /anchor/info` + `POST /anchor/ramp` |
| Frontend `/cobrar-ars` + `/ramp` | ✅ merged | http://localhost:3000/cobrar-ars |
| Pitch deck + guión de demo | ✅ merged | `docs/PITCH.md`, `docs/DEMO.md` |

Levantar local:
```bash
# Backend
cd api && cp .env.example .env   # completar las vars que faltan
npm install && npx prisma generate && npm run dev   # puerto 3001

# Frontend
cd frontend && npm install && npm run dev   # puerto 3000
```

> **Nota de entorno:** esta máquina tiene un proxy TLS corporativo. Si `npx prisma generate` o el fetch al anchor fallan con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, prefijar con `NODE_TLS_REJECT_UNAUTHORIZED=0`. Solo para local.

---

## Tareas para Romi (Backend)

### 1. Conectar Anclap en producción / sandbox
- Crear cuenta en [Anclap](https://anclap.com) y obtener credenciales sandbox ARS↔USDC.
- En `api/.env` setear:
  ```
  ANCHOR_PROVIDER=anclap
  # (o directamente)
  ANCHOR_HOME_DOMAIN=anclap.com
  ANCHOR_ASSET_CODE=ARS
  ```
- El código ya descubre todo vía `stellar.toml` (SEP-1) — no hay nada más que cambiar.
- Validar que `GET /anchor/info` devuelva los endpoints de Anclap y que el flujo SEP-10 + SEP-24 complete con credenciales reales.
- Archivo clave: [api/src/services/anchor.service.ts](../api/src/services/anchor.service.ts)

### 2. Webhook Coelsa real (reemplazar simulación)
- Actualmente `POST /transferencias3/simulate-payment` simula la acreditación.
- Registrar el endpoint de acreditación real con Coelsa/PSP: cuando el banco liquida, Coelsa hace un POST a nuestra URL con los datos de la transferencia.
- Implementar el receptor en un nuevo controller `api/src/controllers/coelsa-webhook.controller.ts`:
  - Validar firma HMAC del webhook.
  - Parsear el monto y referencia.
  - Llamar `sendSettlementPayment()` de `stellar.service.ts` con los datos reales.
- El flujo completo ya existe en `transferencias3.service.ts` — solo hay que reemplazar `simulateInboundPayment()` con la lógica real del webhook.
- Archivo clave: [api/src/services/transferencias3.service.ts](../api/src/services/transferencias3.service.ts)

### 3. Persistencia de transacciones (Prisma)
- Actualmente las transacciones de T3 y anchor no se persisten (respuesta en memoria).
- Agregar modelos en `prisma/schema.prisma`:
  - `T3Transaction` (id, amountArs, reference, status, coelsaId, stellarHash, createdAt)
  - `AnchorTransaction` (id, direction, amount, anchorTransactionId, status, createdAt)
- Correr `npx prisma migrate dev` y conectar los controllers.
- Archivo clave: [api/prisma/schema.prisma](../api/prisma/schema.prisma)

### 4. Variables de entorno para el deploy
- Configurar en el hosting (Railway / Render / Fly) las vars de `api/.env.example`.
- Asegurarse que `PASSPAY_SECRET` sea una cuenta Stellar fondeada en mainnet con trustline a USDC (Circle).
- La cuenta para testnet se fondea gratis con [Friendbot](https://friendbot.stellar.org).

---

## Tareas para Bella (Backend)

### 1. Path Payment en el flujo de cobro
- Actualmente `sendSettlementPayment()` en `stellar.service.ts` envía XLM o el asset configurado directamente.
- Implementar `pathPaymentStrictReceive` para que el comercio reciba siempre en su moneda preferida (ej. USDC), aunque el settlement interno use XLM.
- Stellar SDK: `PathPaymentStrictReceiveOperation` — la ruta la descubre Horizon automáticamente.
- Archivo clave: [api/src/services/stellar.service.ts](../api/src/services/stellar.service.ts) — función `sendSettlementPayment()`.

### 2. Endpoint de historial de pagos
- `GET /payments?merchantId=xxx&from=2026-01-01&to=2026-07-01`
- Agregar filtros por tipo (T3 / anchor / SEP-7) y estado.
- Depende del punto 3 de Romi (persistencia).

### 3. Manejo de errores del anchor (retry + estado)
- En `ramp/page.tsx` el polling tiene un loop básico cada 4s.
- En el backend, si el anchor devuelve `status: error`, agregar lógica de reintento con backoff y notificación.
- Archivo: [api/src/controllers/anchor.controller.ts](../api/src/controllers/anchor.controller.ts)

### 4. Tests de integración para los endpoints nuevos
- Escribir tests con Supertest (ya está en `api`) para:
  - `POST /transferencias3/qr` — verificar que el CRC del EMV es válido.
  - `GET /anchor/info` — mockear fetch del stellar.toml y verificar parseo.
  - `POST /anchor/ramp` — mock del challenge SEP-10 y del interactive SEP-24.
- Hay tests existentes en `api/src/__tests__/` para tomar de referencia.

---

## Tareas para Cariddi (Marketing)

### 1. Video de demo (1–2 min)
- El guión completo está en [docs/DEMO.md](DEMO.md) — 4 escenas listas.
- **Setup necesario antes de grabar:**
  - Pedir a Romi que levante el backend y frontend en local (o en staging).
  - Tener una cuenta testnet fondeada con Friendbot.
  - Setear `ANCHOR_PROVIDER=reference` (usa el anchor de referencia SDF, no necesita credenciales de Anclap).
- Herramientas sugeridas: Loom / OBS para captura de pantalla, Canva/CapCut para editar.
- El video tiene que mostrar:
  1. Home de Passpay.
  2. Flujo cobrar ARS → QR → simular pago → receipt con hash on-chain.
  3. Ramp SEP-24 (abrir el anchor hosted, mostrar el polling de estado).
- Formato: horizontal 16:9, subtitulado en español, música suave de fondo.

### 2. Pitch deck visual (slides)
- El outline completo está en [docs/PITCH.md](PITCH.md) — 11 slides con textos.
- Diseñar en Canva, Figma o PowerPoint con la paleta de marca:
  - Fondo: `#0B0E14` (Deep)
  - Primario: `#5B4BF5` (Indigo)
  - Acento: `#16E0A3` (Mint)
  - Texto: blanco / `#8B7CF8` (Violeta)
  - Alerta/CTA: `#FFB020` (Amber)
- Logo SVG disponible en `frontend/public/passpay-logo.svg`.
- Slide 4 (demo) puede ser una captura del video o un GIF.

### 3. Prueba de mercado / research
- Armar una slide o documento corto (1 página) que responda:
  - ¿Cuántas transacciones mueve Transferencias 3.0 por mes? (dato BCRA público)
  - ¿Cuántos comercios usan QR interoperable en Argentina? (dato BCRA / Mercado Pago)
  - ¿Qué volumen opera Anclap o similares en ARS↔USDC?
  - Comparativa de alternativas: Ripio Business, Lemon Cash Business, etc. — qué tienen y qué no.
- Fuentes: BCRA (bcra.gob.ar), comunicados del BCRA sobre Transferencias 3.0, blogs de Stellar.

### 4. Redes sociales / presencia para el pitch
- Crear o actualizar el perfil de Passpay en Twitter/X y LinkedIn antes del pitch.
- Tweet de lanzamiento del repo (una vez que esté listo): logo + tagline + link al repo.
- Post de LinkedIn contando el proyecto: problema → solución → Stellar.
- Tagline confirmada: **"Cobrá en cualquier moneda. Liquidá en dólares on-chain."**

### 5. One-pager para inversores / jurado
- Una página A4 que resuma:
  - Problema, solución, cómo funciona (diagrama de flujo simple).
  - Stack técnico (sin entrar en detalle, solo Stellar + Transferencias 3.0 + Anclap).
  - Estado actual (MVP validado en testnet).
  - Equipo + contacto.
- Puede reutilizar contenido del pitch deck.

---

## Arquitectura resumida (para contexto de todos)

```
Cliente (banco / billetera)
        │  Transferencias 3.0 (QR EMVCo / CVU)
        ▼
  Passpay Backend (Express/TS)
  ├── /transferencias3  ← acreditación ARS
  ├── /anchor           ← SEP-1/10/24 (Anclap / SDF)
  └── /payments         ← splits, POS, pay-link
        │  Stellar SDK
        ▼
  Stellar Network (Horizon)
  ├── Path Payment → settlement en USDC/XLM
  └── Anchor ↔ off-ramp a ARS (Anclap SEP-24)
```

Repo: https://github.com/Bitcoindefi/Passpay

---

## Contacto técnico
Dudas de código → Leo (llc). Issues del repo: abrir un GitHub issue con label `hackathon`.

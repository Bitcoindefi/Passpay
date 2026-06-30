# Passpay

**Cobrá en pesos. Ahorrá en dólares. — sobre Stellar.**

Passpay es una capa de orquestación de pagos para Argentina que conecta el rail bancario local — **Transferencias 3.0** (el esquema de pagos interoperables del Banco Central) — con **Stellar**. Un comercio cobra en pesos con un QR interoperable, y el valor se **liquida on-chain en dólares** (USDC/XLM) en segundos. Cuando quiere, retira esos dólares de vuelta a pesos en su cuenta bancaria.

> Construido para el track de Integración de Stellar / PULSO Argentina (Pitch Day Buenos Aires).

### 🔗 Demo en vivo

| | |
|---|---|
| 🌐 **App** | **https://passpay-one.vercel.app** |
| ⚙️ **API** | **https://passpay-api.vercel.app** (`/health`, `/transferencias3/collector`, `/anchor/info`…) |
| 🎥 **Video** | [docs/demo/passpay-pitch.mp4](docs/demo/passpay-pitch.mp4) — slides Problema/Solución + demo de los 4 flujos (incl. SEP-24) |
| 🧭 **¿Nuevo en el repo?** | [docs/FLUJOS.md](docs/FLUJOS.md) — los flujos explicados paso a paso |

---

## El problema

Argentina vive dos realidades a la vez:

1. **Transferencias 3.0** está redefiniendo los pagos locales: QR interoperable, instantáneo, 24/7, entre cualquier billetera y banco.
2. La demanda de **dólar digital** es de las más altas de la región — pero pasar pesos a dólares on-chain (y de vuelta) es fricción pura.

No existe una capa que una ambos mundos: **cobrar en pesos por el rail de siempre y que el valor quede en dólares on-chain**, sin que el comercio tenga que entender de cripto.

## La solución

Passpay es esa capa. El comercio configura su moneda de liquidación (USDC/XLM) una vez, y a partir de ahí:

```
   PESOS (rail bancario AR)                         DÓLAR (on-chain · Stellar)
 ┌──────────────────────────┐                    ┌────────────────────────────┐
 │ Cliente paga por QR       │                    │ El comercio recibe USDC/XLM │
 │ Transferencias 3.0 (CVU)  │ ───►  PASSPAY  ───►│ liquidado en Stellar        │
 │  · o wallet Stellar (SEP-7)│      (orquesta +   │  (en segundos)              │
 └──────────────────────────┘       liquida)      └─────────────┬──────────────┘
                                                                 │ cuando quiere
                                                                 ▼
                                                   ┌────────────────────────────┐
                                                   │ Off-ramp: USDC → ARS a un   │
                                                   │ CBU/CVU (BlindPay) o anchor │
                                                   │ SEP-24                       │
                                                   └────────────────────────────┘
```

---

## 🌟 Integración con Stellar (load-bearing)

**Sin Stellar no hay producto.** Stellar no aparece "en una slide": es el motor de cómo se mueve y se guarda el valor. Cada integración abajo es real y, si la sacás, un flujo deja de funcionar.

| Integración Stellar | Estándar / API | Qué hace (y qué se rompe sin esto) | Código |
|---|---|---|---|
| **Liquidación on-chain del cobro** | **Horizon · `payment` + `pathPaymentStrictReceive`** | Cada cobro en ARS se **liquida con una transacción real en Stellar** en la moneda del comercio (USDC/XLM). Sin esto, el comercio nunca recibe dólares. | [`stellar.service.ts`](api/src/services/stellar.service.ts) |
| **Off-ramp USDC → ARS** | **Stellar tx firmada (no custodial)** | El comercio firma con su wallet una **transacción Stellar** que envía USDC a BlindPay, que acredita pesos en su CBU/CVU. La pata on-chain es la transacción Stellar. | [`blindpay.service.ts`](api/src/services/blindpay.service.ts) · [`/offramp`](frontend/app/offramp/page.tsx) |
| **On/off-ramp dólar ↔ peso (anchor)** | **SEP-1 / SEP-10 / SEP-24** | Descubre el anchor por `stellar.toml`, autentica (challenge firmado → JWT) y abre el flujo interactivo de ramp. Agnóstico: Anclap (AR) o anchor de referencia SDF (testnet). | [`anchor.service.ts`](api/src/services/anchor.service.ts) |
| **Pago con wallet / split** | **Horizon · build → sign → submit** | Para POS/pagos compartidos, el backend arma una **tx Stellar sin firmar**, el pagador la firma con Freighter/xBull y se transmite a Horizon. | [`stellar-tx.controller.ts`](api/src/controllers/stellar-tx.controller.ts) |
| **QR de pago para wallets** | **SEP-7** | URI `web+stellar:pay` interoperable para cualquier wallet Stellar. | [`qr.service.ts`](api/src/services/qr.service.ts) |
| **Tasa de cambio entre activos** | **Horizon `/paths`** | Tasa real desde el DEX de Stellar para la conversión on-chain. | [`conversion.service.ts`](api/src/services/conversion.service.ts) |

**Validado end-to-end:** el flujo SEP-1 → SEP-10 → SEP-24 fue probado contra el anchor de referencia de Stellar en testnet (devuelve token y URL hosted reales), y el off-ramp con BlindPay devuelve **cotizaciones reales** USDC→ARS contra su sandbox sobre Stellar. La liquidación de cobros produce **transacciones reales** con su hash verificable en Stellar Expert.

> El rail local también es real, no un mock: el QR de Transferencias 3.0 es **EMVCo** válido (TLV + checksum CRC16-CCITT, validado contra el vector estándar), con CVU recaudador.

### 🔎 Pruebas on-chain (Stellar Testnet — verificables en Stellar Expert)

Cada cobro liquidado genera una **transacción real en Stellar**. Estas son verificables públicamente:

| Qué | Verificar en Stellar Expert |
|---|---|
| **Liquidación de un cobro** (payment 101.25 XLM) | [`4299cea1…e3c4`](https://stellar.expert/explorer/testnet/tx/4299cea10ac10e518c50ce97ca1b25c2d0825f937dff46bb32546115bc91e3c4) |
| Otras liquidaciones (mismo flujo) | [`a8f4b6ec…`](https://stellar.expert/explorer/testnet/tx/a8f4b6ecb5cc0d8d0498ccc2eb001496e4f60c032ac10f59f628d34007e29b0b) · [`ba32dd71…`](https://stellar.expert/explorer/testnet/tx/ba32dd71a09d217f67d06ae95ae961b1fcb77e95af3c6c8fbe4fcf5ce5f63465) |
| **Cuenta de tesorería** (Passpay — firma las liquidaciones) | [`GAPIT4QU…MCIO`](https://stellar.expert/explorer/testnet/account/GAPIT4QUIFGUPC2BKS72J75Q455KUEBHWQXFJIOBFFKSANMRL2LUMCIO) |
| **Cuenta del comercio** (recibe los dólares on-chain) | [`GA4SU5RC…2L64`](https://stellar.expert/explorer/testnet/account/GA4SU5RCI4NIBR3LW3OHCE4QDXTAVRXXGGXDSCAD2GKVSIHLNN3D2L64) |
| **Asset USDB del off-ramp** (BlindPay, sobre Stellar) | [`GCQSSIMO…67NX`](https://stellar.expert/explorer/testnet/account/GCQSSIMOW5OCGULZATDXKU5MOJBOMFX6G65X6CXZDQ7AIB3SKFUZ67NX) |
| **Anchor SEP-24** (descubrimiento SEP-1) | [stellar.toml](https://testanchor.stellar.org/.well-known/stellar.toml) |

> Reproducible en vivo: `POST https://passpay-api.vercel.app/transferencias3/simulate-payment` con `{ "amountArs": 15000, "reference": "..." }` devuelve el `stellarTxHash` y su link a Stellar Expert.

---

## Los 4 flujos (qué construimos)

| # | Flujo | Pantalla | Qué hace | Stellar |
|---|-------|----------|----------|---------|
| 1 | **Cobro en ARS** | [`/cobrar-ars`](frontend/app/cobrar-ars) | QR interoperable Transferencias 3.0 → acreditación Coelsa → **liquidación on-chain** | ✅ settlement real |
| 2 | **Cobro compartido (POS)** | [`/pos`](frontend/app/pos) | Dividir una cuenta entre N personas; cada uno paga su parte con su wallet | ✅ tx firmada por pagador |
| 3 | **Off-ramp USDC → ARS** | [`/offramp`](frontend/app/offramp) | Pasar dólares on-chain a pesos en un CBU/CVU (BlindPay; BR/CO en roadmap) | ✅ tx Stellar firmada |
| 4 | **Rampa dólar (anchor)** | [`/ramp`](frontend/app/ramp) | On/off-ramp dólar ↔ peso con un anchor de Stellar | ✅ SEP-1/10/24 |

Y el **panel del comercio** ([`/dashboard`](frontend/app/dashboard)): balance en USDC con equivalente en ARS (cotización oficial **BCRA** en vivo) + timeline de movimientos.

Detalle completo de cada flujo en **[docs/FLUJOS.md](docs/FLUJOS.md)**.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind v4 + Framer Motion |
| Backend | Express + TypeScript (serverless en Vercel) |
| Blockchain | `@stellar/stellar-sdk` + Horizon (testnet/mainnet) |
| Anchor | SEP-1 / SEP-10 / SEP-24 (Anclap · anchor de referencia SDF) |
| Off-ramp fiat | BlindPay (USDC→ARS por rail `transfers_bitso`) |
| Rail local | Transferencias 3.0 (BCRA) · QR EMVCo · Coelsa |
| Cotización | API oficial del **BCRA** (ARS/USD) con cache + fallback |
| Wallets | Stellar Wallets Kit (Freighter, xBull, Albedo, LOBSTR) |
| Persistencia | Prisma + PostgreSQL (Supabase) |
| Deploy | Vercel (2 proyectos: `passpay` + `passpay-api`) |

---

## API

```
# Salud
GET  /health

# Transferencias 3.0 (BCRA) — cobro en ARS
GET  /transferencias3/collector          CVU/alias del comercio recaudador
POST /transferencias3/qr                 genera QR interoperable EMVCo (ARS)
POST /transferencias3/simulate-payment   acreditación Coelsa + liquidación on-chain

# Anchor (on/off-ramp dólar · SEP-1/10/24)
GET  /anchor/info                        anchor activo + assets/fiat soportados
POST /anchor/ramp                        inicia depósito/retiro → { interactiveUrl, transactionId }
GET  /anchor/transaction/:id             estado SEP-24 (polling)

# Off-ramp USDC → ARS (BlindPay)
GET  /blindpay/customers                 receivers KYC
POST /blindpay/customers/:id/bank-accounts  adjunta cuenta ARS (CBU/CVU)
POST /blindpay/quote                     cotización USDC → ARS (real)
POST /blindpay/authorize                 XDR Stellar sin firmar
POST /blindpay/payout                    ejecuta el payout con la tx firmada

# Splits / pagos con wallet
POST /splits                             crear un split
GET  /splits/:id                         estado (polling)
GET  /splits/:id/tx                      tx Stellar sin firmar (para la wallet)
POST /splits/:id/tx/submit               transmite la tx firmada a Horizon
GET  /splits/:id/qr                      QR SEP-7

# Cotización y otros
GET  /rates/ars-usd                      cotización oficial BCRA (cacheada)
POST /mp/preference/:splitId             MercadoPago (checkout local)
POST /webhooks/coelsa                    receptor de acreditaciones Coelsa (HMAC)
```

---

## Correr local

**Requisitos:** Node.js 18+, npm.

```bash
# Backend
cd api
cp .env.example .env        # completar claves Stellar testnet + credenciales
npm install
npx prisma generate
npm run dev                 # http://localhost:3001

# Frontend (otra terminal)
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

Variables clave (ver [`api/.env.example`](api/.env.example)): `PASSPAY_SECRET`, `MERCHANT_PUBLIC`, `ANCHOR_PROVIDER` (`reference`|`anclap`), `PASSPAY_CVU`, `T3_SETTLE_ASSET_CODE`, `BLINDPAY_API_KEY`, `BLINDPAY_INSTANCE_ID`, `DATABASE_URL`.

> Para crear un cliente AR de prueba en BlindPay (cuenta ARS + quote real): `node api/scripts/seed-blindpay-ar.mjs`.

---

## Deploy (Vercel)

Monorepo desplegado como **dos proyectos** con auto-deploy desde GitHub:

- **`passpay`** → `frontend/` (Next.js) → https://passpay-one.vercel.app
- **`passpay-api`** → `api/` (Express serverless) → https://passpay-api.vercel.app

El frontend apunta al backend vía `NEXT_PUBLIC_API_URL`. Pasos detallados en [docs/HANDOFF.md](docs/HANDOFF.md).

---

## Estado: real vs pendiente

| Pieza | Estado |
|-------|--------|
| QR EMVCo Transferencias 3.0 (CRC16 validado) | ✅ Real |
| Liquidación on-chain en Stellar (path payment) | ✅ Real (tx + hash en Stellar Expert) |
| Off-ramp BlindPay — cotización USDC→ARS | ✅ Real (sandbox) |
| Anchor SEP-1/10/24 | ✅ Validado en testnet |
| Cotización ARS/USD | ✅ API oficial del BCRA |
| Acreditación Coelsa | 🟡 Simulada (falta webhook bancario real) |
| Persistencia (splits, payouts) | 🟡 Prisma/Supabase listo; instancia a reactivar |
| Off-ramp BR/COP (Abroad) | 🔜 Roadmap (onboarding de partner) |

---

## Roadmap

- [x] Liquidación on-chain real vía Stellar (`payment` / `pathPaymentStrictReceive`)
- [x] Anchor SEP-10 + SEP-24 (on/off-ramp), validado en testnet
- [x] Transferencias 3.0 — QR EMVCo + acreditación + settlement on-chain
- [x] Off-ramp USDC → ARS no custodial (BlindPay) con tx Stellar firmada
- [x] Cotización ARS/USD oficial del BCRA
- [x] Deploy en producción (Vercel)
- [ ] Anclap producción (credenciales ARS ↔ USDC)
- [ ] Webhook bancario real (Coelsa) en lugar de la simulación
- [ ] Off-ramp Brasil (PIX) / Colombia (PSE) vía Abroad
- [ ] Trustless Work escrow (Soroban) para cobros con liberación condicionada

---

## Licencia

MIT — ver [LICENSE](./LICENSE). Contribuciones: [CONTRIBUTING.md](./CONTRIBUTING.md).

**Construido sobre Stellar 🌟**

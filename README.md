# Passpay

**Cobrá en cualquier moneda. Liquidá en dólares on-chain.**

Passpay es la capa de orquestación de pagos que conecta **Transferencias 3.0** (el esquema de pagos interoperables del Banco Central de Argentina) con **Stellar**: un comercio cobra en pesos con un QR interoperable, y el valor se liquida instantáneamente on-chain en dólares (USDC) o XLM, con on/off-ramp a través de un **anchor SEP-24**.

> Construido para el track de Integración de Stellar / PULSO Argentina.

---

## El problema

Argentina vive dos realidades simultáneas:

1. **Transferencias 3.0** está redefiniendo los pagos locales: QR interoperable, instantáneo, 24/7, entre cualquier billetera y banco.
2. La demanda de **dólar digital** es de las más altas de la región — pero mover pesos a dólares on-chain es fricción pura.

No existe una capa que una ambos mundos: cobrar en pesos por el rail local y **settlear en dólares on-chain** sin que el comercio tenga que entender de cripto.

## La solución

Passpay es esa capa. El comercio configura su **moneda de liquidación** (USDC/XLM) una vez. A partir de ahí:

```
Cliente paga en ARS (Transferencias 3.0)        Cliente paga con wallet Stellar
        │                                                │
        ▼                                                ▼
   QR interoperable EMVCo  ───────►  PASSPAY  ◄───────  QR SEP-7
   (CVU + Coelsa)                       │              (XLM/USDC)
                                        ▼
                         Conversión + liquidación on-chain
                                        │
                                        ▼
                   El comercio recibe SIEMPRE su moneda configurada
                   (USDC/XLM en Stellar)  ·  off-ramp a ARS vía anchor SEP-24
```

---

## Cómo toca Stellar (load-bearing)

Las integraciones con Stellar **son** el producto, no un adorno:

| Integración | Estándar | Qué hace | Dónde |
|---|---|---|---|
| **On/off-ramp dólar ↔ ARS** | **SEP-1 / SEP-10 / SEP-24** | Autenticación web + depósito/retiro interactivo contra un anchor real (Anclap en producción, anchor de referencia de la SDF en testnet). Descubre endpoints dinámicamente vía `stellar.toml`. | [`anchor.service.ts`](api/src/services/anchor.service.ts) |
| **Liquidación on-chain** | **Path Payment (Horizon)** | Settlement real en Stellar: `pathPaymentStrictReceive` para entregar al comercio exactamente su moneda configurada usando el DEX. | [`stellar.service.ts`](api/src/services/stellar.service.ts) |
| **Cobro local → on-chain** | **Transferencias 3.0 (BCRA) + EMVCo** | QR interoperable real (TLV + CRC16-CCITT), CVU recaudador, acreditación Coelsa, y liquidación on-chain del valor cobrado. | [`transferencias3.service.ts`](api/src/services/transferencias3.service.ts) |
| **Tasas de cambio** | **Horizon `/paths`** | Tasa real desde el DEX de Stellar para la conversión entre activos. | [`conversion.service.ts`](api/src/services/conversion.service.ts) |
| **QR de pago wallet** | **SEP-7** | URI `web+stellar:pay` interoperable para wallets. | [`qr.service.ts`](api/src/services/qr.service.ts) |

El flujo SEP-10 → SEP-24 está **validado end-to-end** contra el anchor de referencia de Stellar en testnet (autenticación + depósito interactivo devuelven token y URL hosted reales).

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js + React 19 + Tailwind + Framer Motion |
| Backend | Express + TypeScript |
| Blockchain | `@stellar/stellar-sdk` + Horizon (testnet/mainnet) |
| Anchor | SEP-1 / SEP-10 / SEP-24 (Anclap · anchor de referencia SDF) |
| Rail local | Transferencias 3.0 (BCRA) · QR interoperable EMVCo · Coelsa |
| Wallets | Freighter, xBull, Albedo, LOBSTR |
| Persistencia | Prisma + PostgreSQL |

---

## Estructura

```
passpay/
├── api/                                  # Backend Express + TypeScript
│   └── src/
│       ├── services/
│       │   ├── anchor.service.ts         # SEP-1/10/24 — on/off-ramp
│       │   ├── transferencias3.service.ts# Transferencias 3.0 + EMVCo QR
│       │   ├── stellar.service.ts        # settlement on-chain (path payment)
│       │   ├── conversion.service.ts     # tasas vía DEX Horizon
│       │   └── qr.service.ts             # SEP-7
│       ├── controllers/                  # anchor, transferencias3, splits, qr, payments
│       ├── config/anchor.ts              # presets de anchor (reference / anclap)
│       └── routes/
└── frontend/                             # Next.js
    └── app/
        ├── page.tsx                      # Home
        ├── pos/                          # Comercio — QR de cobro
        ├── pay/[id]/                     # Pagador — wallet + moneda
        ├── cobrar-ars/                   # Transferencias 3.0 — cobro en ARS
        └── ramp/                         # Anchor SEP-24 — on/off-ramp dólar
```

---

## Correr el proyecto

**Requisitos:** Node.js 18+, npm

```bash
# Backend
cd api
cp .env.example .env       # completar con claves Stellar testnet
npm install
npx prisma generate
npm run dev                # http://localhost:3001

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev                # http://localhost:3000
```

Variables clave (ver [`api/.env.example`](api/.env.example)): `PASSPAY_SECRET`, `MERCHANT_PUBLIC`, `ANCHOR_PROVIDER` (`reference` | `anclap`), `PASSPAY_CVU`, `T3_SETTLE_ASSET_CODE`.

---

## API

### Anchor (on/off-ramp · SEP-24)
```
GET  /anchor/info               anchor activo + assets/fiat soportados
POST /anchor/ramp               inicia depósito/retiro interactivo → { interactiveUrl, transactionId }
GET  /anchor/transaction/:id    estado SEP-24 (polling)
```

### Transferencias 3.0 (BCRA)
```
GET  /transferencias3/collector       CVU/alias del comercio recaudador
POST /transferencias3/qr              genera QR interoperable EMVCo (ARS)
POST /transferencias3/simulate-payment  acreditación Coelsa + liquidación on-chain
```

### Splits / pagos
```
POST /splits                    crear un split
GET  /splits/:id                estado
GET  /splits/:id/intent         monto restante + datos de pago
POST /splits/:id/pay            registrar un pago
POST /splits/:id/release        disparar settlement
GET  /splits/:id/qr             QR SEP-7
```

---

## Demo

1. **Cobro en ARS** (`/cobrar-ars`): el comercio ingresa un monto → Passpay genera un QR interoperable Transferencias 3.0 (EMVCo) → "Simular pago" acredita los ARS vía Coelsa y **liquida on-chain en Stellar** (link a Stellar Expert).
2. **Rampa dólar** (`/ramp`): retiro/depósito contra el anchor SEP-24 → se abre el flujo hosted del anchor → polling de estado hasta `completed`.
3. **Split de pago** (`/pos` → `/pay/:id`): un grupo divide una cuenta, cada quien paga con su wallet/moneda y el comercio recibe su moneda configurada.

---

## Roadmap

- [x] Path Payment real vía Stellar DEX (Horizon)
- [x] Anchor SEP-10 + SEP-24 (on/off-ramp), validado en testnet
- [x] Transferencias 3.0 — QR interoperable EMVCo + acreditación + settlement on-chain
- [ ] Anclap producción (credenciales ARS ↔ USDC)
- [ ] Webhook bancario real (Coelsa) en lugar de la simulación
- [ ] Trustless Work escrow (Soroban) para cobros con liberación condicionada

---

## Licencia

MIT — ver [LICENSE](./LICENSE). Contribuciones: [CONTRIBUTING.md](./CONTRIBUTING.md).

**Construido sobre Stellar 🌟**

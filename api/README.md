# Passpay Backend

> Capa de orquestación de pagos: conecta **Transferencias 3.0** (BCRA) con **Stellar**, liquidando on-chain en dólares.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

Backend Express + TypeScript que orquesta cobros heterogéneos (peso vía Transferencias 3.0, wallets Stellar, USDC/XLM) y liquida al comercio en su moneda configurada on-chain.

---

## Integraciones Stellar (load-bearing)

| Módulo | Estándar | Servicio |
|---|---|---|
| On/off-ramp dólar ↔ ARS | SEP-1 / SEP-10 / SEP-24 | `services/anchor.service.ts` |
| Liquidación on-chain | Path Payment (Horizon) | `services/stellar.service.ts` |
| Cobro local → on-chain | Transferencias 3.0 + EMVCo | `services/transferencias3.service.ts` |
| Tasas de cambio | Horizon `/paths` | `services/conversion.service.ts` |
| QR de pago wallet | SEP-7 | `services/qr.service.ts` |

El anchor es **agnóstico**: descubre sus endpoints desde el `stellar.toml` (SEP-1) del `home_domain` configurado, hace SEP-10 (challenge firmado → JWT) y SEP-24 (depósito/retiro interactivo). Por defecto apunta al anchor de referencia de la SDF (testnet); en producción a Anclap (ARS ↔ USDC). Flujo validado end-to-end en testnet.

---

## Endpoints

### Anchor — on/off-ramp (SEP-24)
```
GET  /anchor/info                 anchor activo + assets/fiat
POST /anchor/ramp                 { direction: "deposit"|"withdraw", amount? } → { interactiveUrl, transactionId }
GET  /anchor/transaction/:id      estado SEP-24 (polling)
```

### Transferencias 3.0 (BCRA)
```
GET  /transferencias3/collector         CVU/alias del recaudador
POST /transferencias3/qr                { amountArs, reference? } → QR EMVCo (emv + qrImage)
POST /transferencias3/simulate-payment  { amountArs, reference } → acreditación Coelsa + settlement on-chain
```

### Splits / pagos
```
POST /splits                 crear split
GET  /splits/:id             estado
GET  /splits/:id/intent      monto restante + memo
POST /splits/:id/pay         registrar pago
POST /splits/:id/release     disparar settlement
GET  /splits/:id/qr          QR SEP-7
GET  /splits/:id/summary     resumen
POST /splits/:id/cancel      cancelar
GET  /health                 healthcheck
```

---

## Setup

```bash
cp .env.example .env      # claves Stellar testnet + config anchor/T3
npm install
npx prisma generate       # cliente Prisma
npm run dev               # ts-node-dev en :3001
```

Variables clave (ver `.env.example`):

```env
PASSPAY_SECRET=SA...           # firma settlements y SEP-10 (anchor)
MERCHANT_PUBLIC=GA...          # destino del settlement on-chain
STELLAR_NETWORK=testnet
ANCHOR_PROVIDER=reference      # reference | anclap
PASSPAY_CVU=0000003100099999999999
T3_SETTLE_ASSET_CODE=XLM       # XLM | USDC
```

> Nota: el proyecto corre en dev con `ts-node-dev --transpile-only`. El cobro Transferencias 3.0 simula el banco/Coelsa, pero el QR cumple el formato EMVCo real y el settlement es una transacción Stellar real.

---

## Máquina de estados (splits)

```
PENDING → PARTIAL → READY_FOR_SETTLEMENT → SETTLED
PENDING → CANCELLED
```

Cuando `totalPaid >= totalAmount`, el settlement se dispara on-chain vía `stellar.service.ts`.

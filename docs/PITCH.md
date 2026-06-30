# Passpay — Pitch Deck

> Deck estilo YC para el pitch IRL (PULSO Argentina / track de Integración Stellar).
> Cada `##` = 1 slide. Diseñar con la paleta: Indigo `#5B4BF5` → Teal `#2DD4BF`, fondo Deep `#0B0E14`.
> Demo en vivo: **https://passpay-one.vercel.app** · Repo: github.com/Bitcoindefi/Passpay

---

## 1 · Portada

# Passpay
**Cobrá en pesos. Ahorrá en dólares.**

La capa que conecta el rail de pagos argentino (Transferencias 3.0) con el dólar on-chain (Stellar).

*Una línea: el comercio cobra en pesos como siempre, pero el valor le queda en dólares.*

---

## 2 · El problema

**Argentina vive dos realidades a la vez:**

- 🇦🇷 **Cobrás en pesos.** Transferencias 3.0 (BCRA) ya mueve los pagos locales: QR interoperable, instantáneo, 24/7.
- 💸 **Pero el peso se devalúa.** La demanda de dólar es de las más altas del mundo: el argentino quiere ahorrar en USD.
- 🧱 **No hay puente.** Pasar lo que cobrás en pesos a dólares (y de vuelta) es fricción pura: cuevas, límites, cripto compleja, custodia.

> "Cobro fácil en pesos, o me complico para tener dólares. No las dos." — todo comercio argentino.

---

## 3 · La solución

**Passpay: cobrás en pesos, el valor queda en dólares on-chain. Sin tocar cripto.**

El comercio configura su moneda de ahorro (USDC) una vez. Después:

1. Cobra con un **QR de Transferencias 3.0** (el de siempre).
2. Passpay **liquida en dólares on-chain** en Stellar, en segundos.
3. Retira a pesos en su cuenta cuando quiere (off-ramp a CBU/CVU).

**UX cripto-invisible:** nunca ve una seed phrase para cobrar.

---

## 4 · Demo (el corazón)

Mostrar en vivo (https://passpay-one.vercel.app):

1. `/cobrar-ars` — monto → **QR interoperable real** → "pago" → **liquidación on-chain** con hash verificable en Stellar Expert.
2. `/dashboard` — balance en USD con equivalente en ARS (cotización **BCRA** en vivo) + movimientos.
3. `/offramp` — retiro **USDC → ARS** a un CBU (cotización real BlindPay).

*No es un mockup: hay transacciones reales en Stellar testnet.*

---

## 5 · Por qué ahora

- **Transferencias 3.0** (lanzado por el BCRA en 2024) volvió interoperables los QR: timing perfecto para una capa encima.
- **Stablecoins en LATAM**: adopción récord global; el dólar digital ya es comportamiento, no narrativa.
- **Stellar**: liquidación en segundos, fees ínfimos, y anchors regulados para el on/off-ramp fiat.

> La infraestructura recién ahora existe para hacer esto simple. Hace 2 años, no.

---

## 6 · Cómo funciona (arquitectura)

```
[Cliente] --ARS, QR T3--> Passpay --liquida--> Stellar (USDC) --off-ramp--> [CBU del comercio]
                             │                     │
                       orquestación          settlement on-chain
                       + conversión           (verificable)
```

Stack: Next.js + Express/TS + `@stellar/stellar-sdk` + Horizon. Anchor SEP-1/10/24, off-ramp BlindPay, rail EMVCo + Coelsa, tasa BCRA. **Open source (MIT).**

---

## 7 · Stellar bajo el capó (load-bearing)

| Capa | Estándar | Rol |
|---|---|---|
| Liquidación on-chain | Horizon · payment / path payment | el comercio recibe dólares |
| Off-ramp USDC→ARS | tx Stellar firmada (no custodial) | dólares → pesos a un CBU |
| On/off-ramp anchor | SEP-1 / SEP-10 / SEP-24 | rampa fiat ↔ dólar |
| Pago con wallet | build → sign → submit | POS / split |

*Sin Stellar no hay producto. Hay txs reales verificables en Stellar Expert.*

---

## 8 · Mercado

- **TAM** — pagos digitales + flujos de stablecoin en LATAM (decenas de miles de millones de USD/año).
- **SAM** — comercios y freelancers en Argentina que cobran en pesos y quieren ahorrar/operar en dólares (millones de CUIT activos; Transferencias 3.0 procesa cientos de millones de operaciones).
- **SOM (beachhead)** — SMBs cripto-friendly, vendedores online, freelancers y profesionales que ya buscan dolarizarse: decenas de miles, alcanzables vía comunidad y partners.

*Entrás por el nicho que ya quiere dólares, y te expandís al comercio masivo.*

---

## 9 · Modelo de negocio (revenue)

Ingresos por transacción, alineados al volumen del comercio:

1. **Spread de conversión** ARS↔USD: ~**0,8–1,5%** por operación (cobro y off-ramp).
2. **Fee de off-ramp** a CBU/CVU: fijo + variable.
3. **SaaS para comercios** (tier Pro): dashboard multi-usuario, conciliación, analytics, API — abono mensual.
4. **Float / tesorería**: rendimiento sobre saldos en tránsito (a futuro, regulado).

> Unit economics: con 1% de spread, un comercio que cobra USD 5.000/mes deja ~USD 50/mes de ingreso, a costo marginal casi nulo (infra Stellar).

---

## 10 · Go-to-market

- **Fase 1 — Beachhead (0–6 meses):** comunidad cripto/fintech AR, freelancers y vendedores online. Onboarding self-serve + referidos. Foco en "cobrá y dolarizate en un toque".
- **Fase 2 — Partners (6–18 meses):** integración vía API/SDK con billeteras, PSPs y plataformas de e-commerce; Passpay como "liquidación en dólares as-a-service".
- **Fase 3 — Escala (18+):** comercio masivo, payouts B2B, remesas, y expansión LATAM (Brasil PIX, Colombia PSE — rails ya contemplados).

CAC bajo: producto que se muestra solo (el comercio ve dólares cayendo en segundos).

---

## 11 · Competencia / diferencial

| | Billeteras (Lemon, Belo, Ripio) | PSP tradicional (Mercado Pago) | **Passpay** |
|---|---|---|---|
| Cobro local interoperable | parcial | sí | **sí (T3)** |
| Liquidación en dólares on-chain | custodial | no | **sí, no custodial** |
| UX cripto-invisible para el comercio | no | n/a | **sí** |
| Open / componible (API, Stellar) | no | no | **sí** |

**Diferencial:** no somos otra wallet. Somos la **capa de orquestación** que convierte el rail local en liquidación en dólares — integrable y abierta.

---

## 12 · Tracción / estado

- ✅ **MVP funcional y deployado** (front + API en producción).
- ✅ **Liquidación on-chain real** en Stellar (txs verificables en Stellar Expert).
- ✅ Off-ramp USDC→ARS con cotización real (BlindPay) + anchor SEP-24 validado en testnet.
- ✅ QR Transferencias 3.0 EMVCo válido + tasa oficial BCRA en vivo.
- ✅ Open source (MIT), demo pública y video.

*De idea a producto liquidando dólares on-chain, durante el hackathon.*

---

## 13 · Roadmap

- **Q1** — Anclap producción (ARS↔USDC con credenciales), webhook bancario Coelsa real, primeros comercios reales.
- **Q2** — App de comercio completa, conciliación, multi-usuario; piloto con partner (billetera/PSP).
- **Q3** — Off-ramp Brasil (PIX) y Colombia (PSE); payouts B2B.
- **Q4** — Escrow condicional (Soroban / Trustless Work), tesorería con rendimiento.

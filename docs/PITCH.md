# Passpay — Pitch Deck (outline)

> Guión de slides para el pitch IRL (PULSO Argentina / track de Integración Stellar).
> Cada bloque = 1 slide. Diseñar con la paleta de marca: Indigo `#5B4BF5`, Mint `#16E0A3`, fondo Deep `#0B0E14`.

---

## 1 — Portada
**Passpay**
*Cobrá en cualquier moneda. Liquidá en dólares on-chain.*
Logo + "Transferencias 3.0 → Stellar". Una línea: el puente entre el peso argentino y el dólar on-chain.

## 2 — El problema
Argentina, dos realidades a la vez:
- **Transferencias 3.0** ya mueve los pagos locales: QR interoperable, instantáneo, 24/7.
- La demanda de **dólar digital** es de las más altas de la región.
- **No hay capa que los una.** Cobrar en pesos y settlear en dólares on-chain es fricción pura para un comercio.

> "Hoy el comercio elige: o cobra fácil en pesos, o se complica para tener dólares."

## 3 — La solución
Passpay: una capa de orquestación. El comercio configura su **moneda de liquidación** una vez (USDC/XLM).
- Cliente paga como quiere (ARS por Transferencias 3.0, o wallet Stellar).
- Passpay convierte y **liquida on-chain**.
- El comercio recibe **siempre** su moneda. Off-ramp a pesos vía anchor cuando quiera.

## 4 — Demo (el corazón del pitch)
Mostrar en vivo (ver `DEMO.md`):
1. `/cobrar-ars`: monto → QR interoperable EMVCo → "simular pago" → **tx real en Stellar Expert**.
2. `/ramp`: retiro USDC → ARS vía anchor **SEP-24** (flujo hosted real).

## 5 — Por qué es diferente
- **Integración load-bearing, no decorativa:** sin Stellar no hay producto.
- **Rail local real:** QR EMVCo válido (TLV + CRC16), no un mock de UI.
- **Anchor real:** SEP-1/10/24 agnóstico — Anclap en prod, anchor de referencia SDF en testnet. Validado end-to-end.
- **UX cripto-invisible:** el comercio nunca toca una seed phrase para cobrar.

## 6 — Cómo funciona (arquitectura)
Diagrama (`docs/architecture.svg`):
`Transferencias 3.0 / SEP-7  →  Passpay (orquestación + conversión)  →  Stellar (settlement) ↔ Anchor SEP-24 (fiat)`
Stack: Next.js + Express/TS + `@stellar/stellar-sdk` + Horizon + Prisma.

## 7 — Stellar bajo el capó
| Estándar | Uso |
|---|---|
| SEP-1/10/24 | on/off-ramp dólar ↔ ARS (anchor) |
| Path Payment | settlement en la moneda del comercio |
| SEP-7 | QR de pago para wallets |
| EMVCo + Coelsa | Transferencias 3.0 |

## 8 — Mercado / impacto
- Transferencias 3.0 redefine los flujos de pago locales: timing perfecto.
- Demanda de dólar digital altísima en LATAM.
- Comercios, freelancers, remesas: cualquiera que cobre en pesos y quiera ahorrar/operar en dólares.

## 9 — Tracción / estado
- MVP funcional: anchor SEP-24 validado en testnet, QR Transferencias 3.0 EMVCo válido, settlement on-chain real.
- Open source (MIT). Repo + README + demo.

## 10 — Roadmap
- Anclap producción (ARS ↔ USDC con credenciales).
- Webhook bancario Coelsa real (reemplaza simulación).
- Escrow Soroban (Trustless Work) para cobros con liberación condicionada.

## 11 — Cierre / ask
**Passpay: el peso entra por el rail de siempre, el dólar sale on-chain.**
Equipo + contacto + link al repo.

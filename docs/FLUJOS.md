# Passpay — Cómo funciona (explicación de los flujos)

> Para el equipo. Si nunca tocaste el repo, leé esto primero. Va de lo simple a lo técnico.
> Demo en video: [docs/demo/passpay-flows.webm](demo/passpay-flows.webm).

---

## 1. La idea en una frase

**El comercio cobra en pesos (como siempre), pero el valor le queda en dólares on-chain (USDC/XLM en Stellar), y puede pasarlo a pesos cuando quiera.**

Mental model: Passpay es el **puente** entre el rail de pagos argentino (Transferencias 3.0) y la red Stellar.

```
   PESOS (mundo bancario)                      DÓLAR (on-chain, Stellar)
   ┌─────────────────────┐                     ┌──────────────────────────┐
   │ Cliente paga por QR  │   Passpay (puente)  │ El comercio recibe USDC  │
   │ Transferencias 3.0   │ ──────────────────► │ liquidado en Stellar     │
   │ (CVU / billetera)    │                     │                          │
   └─────────────────────┘                     └──────────┬───────────────┘
                                                           │ cuando quiere
                                                           ▼
                                                ┌──────────────────────────┐
                                                │ Off-ramp: USDC → pesos    │
                                                │ a un CBU (BlindPay)        │
                                                └──────────────────────────┘
```

Todo lo que hace Passpay gira alrededor de ese viaje: **peso entra → se liquida en dólar on-chain → sale a peso cuando hace falta.**

---

## 2. Los 4 flujos (qué hace cada uno)

| # | Flujo | Pantalla | En una línea |
|---|-------|----------|--------------|
| 1 | **Cobro en ARS** | `/cobrar-ars` | El comercio genera un QR de Transferencias 3.0, el cliente paga en pesos y Passpay liquida en Stellar. |
| 2 | **Cobro compartido (POS)** | `/pos` | Dividir una cuenta entre varias personas; cada una paga su parte con su wallet. |
| 3 | **Off-ramp USDC → ARS** | `/offramp` | Pasar dólares on-chain a pesos en una cuenta bancaria (CBU/CVU) vía BlindPay. |
| 4 | **Rampa dólar (anchor)** | `/ramp` | On/off-ramp dólar ↔ peso usando un anchor de Stellar (estándares SEP). |

Y el **panel** (`/dashboard`): balance del comercio (USDC ↔ ARS) + lista de movimientos. No es un flujo, es el "home" del comercio.

---

## 3. Flujo por flujo (paso a paso)

### Flujo 1 — Cobro en ARS (Transferencias 3.0) ✅ end-to-end real

**Qué ve el comercio:** ingresa un monto en pesos → "Generar QR" → aparece un QR → (en la demo) "Simular pago" → pantalla de éxito con el hash de Stellar.

**Qué pasa por detrás:**
1. Front llama `POST /transferencias3/qr` con el monto.
2. Backend arma un **QR EMVCo real** (el mismo formato de Transferencias 3.0): TLV + checksum CRC16-CCITT, con el **CVU recaudador** de Passpay. → `api/src/services/transferencias3.service.ts`
3. El cliente pagaría desde su banco/billetera. En la demo, `POST /transferencias3/simulate-payment` simula la **acreditación de Coelsa** (la cámara compensadora).
4. Apenas se acredita el peso, Passpay manda una **transacción real en Stellar** liquidando en la moneda del comercio (XLM/USDC). → `sendSettlementPayment()` en `api/src/services/stellar.service.ts`
5. La pantalla muestra el **Coelsa ID** + el **hash on-chain** (link a Stellar Expert).

> Lo real: el QR EMVCo (validado contra el vector estándar) y la liquidación on-chain. Lo simulado: la acreditación bancaria de Coelsa (necesita webhook real de Coelsa, que es una integración bancaria).

### Flujo 2 — Cobro compartido / POS ✅ UI real (persistencia pendiente)

**Qué ve el comercio:** monto total → elige cantidad de personas (±) → "Generar QR". El QR lleva a `/pay/{id}` y cada persona paga **su parte**.

**Qué pasa por detrás:**
1. `POST /splits` crea un **split** (`mode: OPEN_POOL`, asset de liquidación XLM). → `api/src/services/splits.service.ts`
2. El QR codifica el link `/pay/{id}?personas=N`.
3. Cada persona entra, elige su moneda y paga: el backend arma una **transacción Stellar sin firmar** (`/splits/:id/tx`), la persona la firma con su wallet (Freighter/xBull) y se transmite (`/splits/:id/tx/submit`). → `api/src/controllers/stellar-tx.controller.ts`
4. El front del POS hace **polling** del estado; cuando pagaron todos, el split queda `SETTLED`.

> Estado: el cálculo del split + el QR son frontend real. La **creación del split persiste en Supabase (Postgres vía Prisma)**, que ahora mismo está caída/inalcanzable desde la red del equipo (ver §5), por eso en el video esa llamada va stubbeada.

### Flujo 3 — Off-ramp USDC → ARS (BlindPay) ✅ quote real

**Qué ve el comercio:** elige cliente → elige/crea una cuenta ARS (CBU/CVU) → ingresa monto en USDC → "Cotizar" → ve cuánto recibe en pesos → "Firmar" con la wallet.

**Qué pasa por detrás (la parte importante de entender):**
1. BlindPay es un proveedor que convierte **stablecoin on-chain → fiat local** por rails (en AR: `transfers_bitso` → ARS).
2. La **moneda de destino la define la cuenta bancaria**, no un campo aparte. Si la cuenta es `transfers_bitso` (CBU/CVU argentino) → el payout sale en **ARS**.
3. Secuencia: `POST /blindpay/quote` (monto en **centavos**) → `POST /blindpay/authorize` (devuelve un XDR sin firmar) → la wallet firma → `POST /blindpay/payout` ejecuta. → `api/src/services/blindpay.service.ts`
4. En la demo se llega hasta el **quote real** contra el sandbox de BlindPay (ej: 50 USDC → ~76.300 ARS). La firma con wallet es un popup externo que no se automatiza en el video.

> Lo real: cotización en vivo contra BlindPay. La firma final necesita una wallet con USDC/USDB.

### Flujo 4 — Rampa dólar (Anchor SEP-24) ✅ descubrimiento real

**Qué ve el usuario:** elige depositar (fondear) o retirar dólares y se abre el flujo del anchor.

**Qué pasa por detrás (esto es 100% Stellar estándar):**
1. **SEP-1**: Passpay lee el `stellar.toml` del anchor y descubre todos sus endpoints. → `api/src/services/anchor.service.ts`
2. **SEP-10**: autenticación web (firma un challenge → JWT).
3. **SEP-24**: abre el flujo interactivo de on/off-ramp del anchor (hosted).
4. Es **agnóstico al anchor**: cambiás `ANCHOR_PROVIDER` en el `.env` y funciona con Anclap (AR real) o el anchor de referencia de la SDF (testnet). Sin tocar código.

> Diferencia con el Flujo 3: el anchor (SEP-24) es el **estándar nativo de Stellar** para ramp; BlindPay es un proveedor que además resuelve el rail local ARS (CBU/CVU). Tenemos los dos caminos.

---

## 4. Cómo se conectan (el viaje del dinero, junto)

```
[Cliente] --paga ARS--> Transferencias 3.0 (QR EMVCo / CVU)
                              │
                              ▼ Coelsa acredita el peso
                        Passpay backend
                              │  manda settlement on-chain
                              ▼
                    Stellar (USDC / XLM)  ← acá vive el valor del comercio
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
   Off-ramp BlindPay (CBU/CVU)        Anchor SEP-24 (dólar ↔ peso)
   USDC → ARS a una cuenta            on/off-ramp estándar de Stellar
```

El **dashboard** muestra ese saldo (en USDC, con su equivalente en ARS) y la lista de movimientos: cobro ARS → liquidación on-chain → off-ramp.

---

## 5. Qué es real y qué está pendiente (importante para el equipo)

| Pieza | Estado |
|-------|--------|
| QR EMVCo de Transferencias 3.0 | ✅ Real (CRC16 validado) |
| Liquidación on-chain en Stellar | ✅ Real (tx + hash en Stellar Expert) |
| Quote de off-ramp (BlindPay) | ✅ Real contra el sandbox |
| Anchor SEP-1/10/24 | ✅ Real (validado contra testanchor.stellar.org) |
| Acreditación de Coelsa | 🟡 Simulada (falta webhook bancario real) |
| Persistencia (splits, payouts) | 🔴 Supabase **caída/inalcanzable** desde la red actual (`db.zoobnfqtpavazeukytcw.supabase.co:5432`). Hay que despausar/reconectar la DB o cambiar `DATABASE_URL`. |
| Firma de wallet (off-ramp / pay) | 🟡 Necesita Freighter/xBull con fondos; no se automatiza en el video |

### ⚠️ Sobre la base de datos (leer)

Ahora mismo la DB **no responde**:

```
Can't reach database server at `db.zoobnfqtpavazeukytcw.supabase.co:5432`
```

**Qué significa:** el backend usa Postgres (Supabase) vía Prisma para guardar los splits y los payouts. Esa instancia está caída o inalcanzable desde la red del equipo. Causa más común: **los proyectos free de Supabase se pausan solos por inactividad** (también puede ser que la red bloquee el puerto 5432).

**Qué SÍ sigue andando con la DB caída:** el QR de Transferencias 3.0, la liquidación on-chain, el quote de BlindPay y el anchor SEP-24 (ninguno depende de la DB).
**Qué NO:** crear un split en el POS y persistir payouts (todo lo que hace `prisma.*.create`). Por eso en el video la creación del split va stubbeada.

**Cómo arreglarlo (cualquiera del equipo con acceso):**
1. Entrar a [app.supabase.com](https://app.supabase.com) → proyecto Passpay.
2. Si dice **"Paused"**, tocar **Restore / Resume** y esperar 1–2 min.
3. Verificar la connection string (Project Settings → Database) y que coincida con `DATABASE_URL` en `api/.env` (y en las env de Vercel).
4. Probar local: `curl -X POST http://localhost:3001/splits -H "Content-Type: application/json" -d '{"totalAmount":1000,"mode":"OPEN_POOL","settlementAsset":{"network":"stellar","type":"native","code":"XLM"}}'` → debe devolver un `id`, no un error de conexión.
5. Si sigue sin reachear desde esta máquina (proxy/firewall bloqueando 5432), usar el **connection pooler de Supabase** (puerto 6543, modo `transaction`) en el `DATABASE_URL`.

Una vez arriba, el POS y la persistencia de payouts graban solos — no hay que tocar código.

---

## 6. Glosario rápido

- **Transferencias 3.0**: esquema del BCRA de pagos interoperables por QR (cualquier banco/billetera lee el mismo QR). Usa formato **EMVCo**.
- **CVU**: como un CBU pero de billetera virtual; es la "cuenta recaudadora" donde caen los pesos.
- **Coelsa**: la cámara compensadora que acredita las transferencias entre bancos.
- **Settlement / liquidación**: mover el valor a la moneda final del comercio (acá, on-chain en Stellar).
- **Anchor**: puente regulado fiat ↔ Stellar. Se habla con él por estándares **SEP**.
- **SEP-1/10/24**: descubrimiento / login / ramp interactivo, respectivamente.
- **BlindPay**: proveedor de off-ramp (stablecoin → fiat local por rails como CBU/CVU/PIX).
- **Off-ramp / on-ramp**: salir de cripto a fiat / entrar de fiat a cripto.
- **USDC / XLM**: dólar tokenizado / token nativo de Stellar.

---

¿Dudas? El código de cada flujo está en `api/src/services/` (lógica) y `frontend/app/<flujo>/page.tsx` (pantalla). Para correr local mirá [docs/HANDOFF.md](HANDOFF.md).

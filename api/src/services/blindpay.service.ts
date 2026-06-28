// Servicio de off-ramp via BlindPay
// USDC/USDB on-chain (Stellar) → fiat local (ARS/BRL/COP/MXN…) via rails locales
// Docs verificadas contra el SDK oficial: github.com/blindpaylabs/blindpay-go
//
// Flujo off-ramp:
//   1. (prereq) receiver KYC-aprobado + bank account con el rail local (transfers_bitso → ARS)
//   2. POST /instances/:id/quotes            → cotización (la moneda fiat la define el rail del bank account)
//   3. POST /instances/:id/payouts/stellar/authorize → XDR sin firmar (campo transactionHash)
//   4. el cliente firma el XDR con su wallet
//   5. POST /instances/:id/payouts/stellar   → ejecuta el payout con la tx firmada

const BLINDPAY_BASE_URL = (process.env.BLINDPAY_BASE_URL ?? "https://api.blindpay.com/v1").replace(/\/$/, "");
const BLINDPAY_API_KEY = process.env.BLINDPAY_API_KEY!;
const BLINDPAY_INSTANCE_ID = process.env.BLINDPAY_INSTANCE_ID!;

// Red/token del stablecoin de origen. Sandbox: stellar_testnet + USDB. Prod: stellar + USDC.
const BLINDPAY_NETWORK = process.env.BLINDPAY_NETWORK ?? "stellar_testnet";
const BLINDPAY_TOKEN = process.env.BLINDPAY_TOKEN ?? "USDB";

const headers = () => ({
  Authorization: `Bearer ${BLINDPAY_API_KEY}`,
  "Content-Type": "application/json",
});

const instancePath = (suffix: string) => `${BLINDPAY_BASE_URL}/instances/${BLINDPAY_INSTANCE_ID}${suffix}`;

async function bpFetch(url: string, init: RequestInit, context: string) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "object" ? JSON.stringify(body) : body;
    throw new Error(`BlindPay ${context} error (${res.status}): ${msg}`);
  }
  return body;
}

// ── Receivers ────────────────────────────────────────────────

// GET /instances/:id/receivers — listar receivers (clientes)
export async function getBlindPayCustomers() {
  return bpFetch(instancePath("/receivers"), { headers: headers() }, "list receivers");
}

// POST /e/instances/:id/tos — inicia la aceptación de Términos de Servicio.
// Devuelve { url }: el cliente debe abrir esa URL hosted y aceptar para generar un tos_id.
export async function initiateBlindPayTos(params: { idempotency_key: string; receiver_id?: string; redirect_url?: string }) {
  return bpFetch(
    `${BLINDPAY_BASE_URL}/e/instances/${BLINDPAY_INSTANCE_ID}/tos`,
    { method: "POST", headers: headers(), body: JSON.stringify(params) },
    "initiate ToS"
  );
}

// POST /instances/:id/receivers — crear receiver (requiere tos_id ya aceptado)
export async function createBlindPayReceiver(params: Record<string, unknown>) {
  return bpFetch(
    instancePath("/receivers"),
    { method: "POST", headers: headers(), body: JSON.stringify(params) },
    "create receiver"
  );
}

// ── Bank accounts ────────────────────────────────────────────

// GET /instances/:id/receivers/:receiver_id/bank-accounts
export async function getBlindPayBankAccounts(receiver_id: string) {
  return bpFetch(
    instancePath(`/receivers/${receiver_id}/bank-accounts`),
    { headers: headers() },
    "list bank accounts"
  );
}

// POST /instances/:id/receivers/:receiver_id/bank-accounts
// Para ARS: { type: "transfers_bitso", transfers_type: "CBU"|"CVU"|"ALIAS", transfers_account, beneficiary_name, name }
export async function createBlindPayBankAccount(receiver_id: string, params: Record<string, unknown>) {
  return bpFetch(
    instancePath(`/receivers/${receiver_id}/bank-accounts`),
    { method: "POST", headers: headers(), body: JSON.stringify(params) },
    "create bank account"
  );
}

// ── Quote ────────────────────────────────────────────────────

// POST /instances/:id/quotes
// La moneda fiat de destino la define el rail del bank account (transfers_bitso → ARS).
// request_amount va en MINOR UNITS (centavos): 5000 = 50.00.
export async function getBlindPayQuote(params: {
  bank_account_id: string;
  request_amount: number;            // centavos (entero)
  currency_type?: "sender" | "receiver"; // sender = monto en stablecoin; receiver = monto en fiat local
  network?: string;
  token?: string;
  cover_fees?: boolean;
}) {
  const body = {
    bank_account_id: params.bank_account_id,
    currency_type: params.currency_type ?? "sender",
    request_amount: Math.round(params.request_amount),
    network: params.network ?? BLINDPAY_NETWORK,
    token: params.token ?? BLINDPAY_TOKEN,
    cover_fees: params.cover_fees ?? false,
  };
  return bpFetch(
    instancePath("/quotes"),
    { method: "POST", headers: headers(), body: JSON.stringify(body) },
    "quote"
  );
}

// ── Payout (Stellar, no custodial) ───────────────────────────

// POST /instances/:id/payouts/stellar/authorize → devuelve { transactionHash } = XDR SIN FIRMAR
export async function authorizeBlindPayPayout(params: { quote_id: string; sender_wallet_address: string }) {
  return bpFetch(
    instancePath("/payouts/stellar/authorize"),
    { method: "POST", headers: headers(), body: JSON.stringify(params) },
    "authorize payout"
  );
}

// POST /instances/:id/payouts/stellar → ejecuta el payout con la tx firmada
export async function createBlindPayPayout(params: {
  quote_id: string;
  signed_transaction: string;
  sender_wallet_address: string;
}) {
  return bpFetch(
    instancePath("/payouts/stellar"),
    { method: "POST", headers: headers(), body: JSON.stringify(params) },
    "create payout"
  );
}

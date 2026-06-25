// Servicio de off-ramp via Abroad Finance
// Convierte USDC on-chain a BRL (PIX) o COP (Bre-B)
//
// Documentación: https://api.abroad.finance/docs/
// Endpoints clave:
//   POST /quote         → obtener cotización
//   POST /transaction   → crear off-ramp
//   GET  /transaction/{id} → polling de estado
//
// Estado: STUB — pendiente credenciales sandbox
// Mail enviado a Abroad Finance solicitando acceso.
// Activar cambiando ABROAD_API_KEY en .env cuando lleguen las credenciales.

const ABROAD_BASE_URL = process.env.ABROAD_BASE_URL ?? "https://api.abroad.finance";
const ABROAD_API_KEY = process.env.ABROAD_API_KEY;

export type AbroadTargetCurrency = "BRL" | "COP";
export type AbroadPaymentMethod = "PIX" | "PSE";
export type AbroadNetwork = "STELLAR";
export type AbroadCryptoCurrency = "USDC";

export interface AbroadQuoteRequest {
  target_currency: AbroadTargetCurrency;
  payment_method: AbroadPaymentMethod;
  network: AbroadNetwork;
  crypto_currency: AbroadCryptoCurrency;
  amount: number;
}

export interface AbroadQuoteResponse {
  quote_id: string;
  target_currency: string;
  crypto_amount: number;
  fiat_amount: number;
  exchange_rate: number;
  expires_at: string;
}

export interface AbroadTransactionRequest {
  quote_id: string;
  user_id: string;
  account_number: string;  // clave PIX (BRL) o cuenta (COP)
  tax_id?: string;         // CPF (BRL) o NIT (COP)
}

export interface AbroadTransactionResponse {
  transaction_id: string;
  status: string;
  amount: number;
  target_currency: string;
}

// Obtener cotización USDC → BRL o COP
export async function getAbroadQuote(params: AbroadQuoteRequest): Promise<AbroadQuoteResponse> {
  if (!ABROAD_API_KEY) {
    // TODO: reemplazar con llamada real cuando lleguen credenciales
    console.warn("[Abroad] API key no configurada — usando mock");
    return {
      quote_id: `mock-quote-${Date.now()}`,
      target_currency: params.target_currency,
      crypto_amount: params.amount,
      fiat_amount: params.target_currency === "BRL" ? params.amount * 5.2 : params.amount * 4100,
      exchange_rate: params.target_currency === "BRL" ? 5.2 : 4100,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  const res = await fetch(`${ABROAD_BASE_URL}/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": ABROAD_API_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Abroad Finance quote falló: ${res.status}`);
  }

  return res.json();
}

// Crear transacción de off-ramp
export async function createAbroadTransaction(params: AbroadTransactionRequest): Promise<AbroadTransactionResponse> {
  if (!ABROAD_API_KEY) {
    console.warn("[Abroad] API key no configurada — usando mock");
    return {
      transaction_id: `mock-tx-${Date.now()}`,
      status: "PENDING",
      amount: 0,
      target_currency: "BRL",
    };
  }

  const res = await fetch(`${ABROAD_BASE_URL}/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": ABROAD_API_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Abroad Finance transaction falló: ${res.status}`);
  }

  return res.json();
}

// Consultar estado de una transacción
export async function getAbroadTransaction(transactionId: string): Promise<AbroadTransactionResponse> {
  if (!ABROAD_API_KEY) {
    console.warn("[Abroad] API key no configurada — usando mock");
    return {
      transaction_id: transactionId,
      status: "COMPLETED",
      amount: 0,
      target_currency: "BRL",
    };
  }

  const res = await fetch(`${ABROAD_BASE_URL}/transaction/${transactionId}`, {
    headers: { "X-API-Key": ABROAD_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Abroad Finance transaction status falló: ${res.status}`);
  }

  return res.json();
}
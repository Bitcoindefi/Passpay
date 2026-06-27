// Servicio de off-ramp via BlindPay
// USDC on-chain → fiat (ARS/BRL/COP) via rails locales
// Docs: https://www.blindpay.com/docs/essentials/payouts

const BLINDPAY_BASE_URL = process.env.BLINDPAY_BASE_URL ?? 'https://api.blindpay.com/v1';
const BLINDPAY_API_KEY = process.env.BLINDPAY_API_KEY!;
const BLINDPAY_INSTANCE_ID = process.env.BLINDPAY_INSTANCE_ID!;

const headers = () => ({
  'Authorization': `Bearer ${BLINDPAY_API_KEY}`,
  'Content-Type': 'application/json',
});

// GET /instances/:id/payouts/quotes - obtener cotización
export async function getBlindPayQuote(params: {
  amount: number;
  source_currency: 'USDC';
  target_currency: 'ARS' | 'BRL' | 'COP';
  receiver_id: string;
  bank_account_id: string;
}) {
  const res = await fetch(
    `${BLINDPAY_BASE_URL}/instances/${BLINDPAY_INSTANCE_ID}/payout-quotes`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        amount: params.amount,
        source_currency: params.source_currency,
        target_currency: params.target_currency,
        receiver_id: params.receiver_id,
        bank_account_id: params.bank_account_id,
        blockchain: 'stellar',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`BlindPay quote error: ${JSON.stringify(err)}`);
  }

  return res.json();
}

// POST /instances/:id/payouts/stellar/authorize - obtener XDR para firmar
export async function authorizeBlindPayPayout(params: {
  quote_id: string;
  sender_wallet_address: string;
}) {
  const res = await fetch(
    `${BLINDPAY_BASE_URL}/instances/${BLINDPAY_INSTANCE_ID}/payouts/stellar/authorize`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        quote_id: params.quote_id,
        sender_wallet_address: params.sender_wallet_address,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`BlindPay authorize error: ${JSON.stringify(err)}`);
  }

  return res.json(); // devuelve { transaction_hash: "XDR..." }
}

// POST /instances/:id/payouts/stellar - confirmar payout con tx firmada
export async function createBlindPayPayout(params: {
  quote_id: string;
  signed_transaction: string;
  sender_wallet_address: string;
}) {
  const res = await fetch(
    `${BLINDPAY_BASE_URL}/instances/${BLINDPAY_INSTANCE_ID}/payouts/stellar`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(params),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`BlindPay payout error: ${JSON.stringify(err)}`);
  }

  return res.json();
}

// GET /instances/:id/customers - listar receivers
export async function getBlindPayCustomers() {
  const res = await fetch(
    `${BLINDPAY_BASE_URL}/instances/${BLINDPAY_INSTANCE_ID}/customers`,
    { headers: headers() }
  );

  if (!res.ok) throw new Error('BlindPay customers error');
  return res.json();
}

// GET bank accounts de un receiver
export async function getBlindPayBankAccounts(receiver_id: string) {
  const res = await fetch(
    `${BLINDPAY_BASE_URL}/instances/${BLINDPAY_INSTANCE_ID}/customers/${receiver_id}/bank-accounts`,
    { headers: headers() }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`BlindPay bank accounts error: ${JSON.stringify(err)}`);
  }

  return res.json();
}
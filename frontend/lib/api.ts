const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── helpers ──────────────────────────────────────────────
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── splits ───────────────────────────────────────────────
export const api = {
  splits: {
    create: (body: {
      totalAmount: number;
      mode: "FIXED" | "OPEN_POOL";
      settlementAsset: {
        network: string;
        type: string;
        code: string;
        issuer?: string;
      };
      webhookUrl?: string;
    }) => post<any>("/splits", body),

    getById:         (id: string) => get<any>(`/splits/${id}`),
    getIntent:       (id: string) => get<any>(`/splits/${id}/intent`),
    getSummary:      (id: string) => get<any>(`/splits/${id}/summary`),
    getQR:           (id: string) => get<any>(`/splits/${id}/qr`),
    getPayments:     (id: string) => get<any>(`/splits/${id}/payments`),
    cancel:          (id: string) => post<any>(`/splits/${id}/cancel`, {}),
  },

  payments: {
    register: (
      splitId: string,
      body: {
        payerId: string;
        method: "STELLAR" | "BANK_TRANSFER" | "MERCADO_PAGO" | "CARD";
        originalAsset: string;
        originalAmount: number;
      }
    ) => post<any>(`/splits/${splitId}/pay`, body),
  },

  // ── anchor (on/off-ramp dólar ↔ ARS · SEP-24) ────────────
  anchor: {
    info: () =>
      get<{
        name: string;
        homeDomain: string;
        assetCode: string;
        fiatCurrency: string;
        networkPassphrase: string;
      }>("/anchor/info"),

    ramp: (body: { direction: "deposit" | "withdraw"; amount?: string }) =>
      post<{
        anchor: string;
        assetCode: string;
        fiatCurrency: string;
        account: string;
        direction: "deposit" | "withdraw";
        transactionId: string;
        interactiveUrl: string;
        type: string;
      }>("/anchor/ramp", body),

    transaction: (id: string) =>
      get<{
        id: string;
        kind: string;
        status: string;
        amount_in?: string;
        amount_out?: string;
        amount_fee?: string;
        stellar_transaction_id?: string;
        external_transaction_id?: string;
        more_info_url?: string;
        message?: string;
      }>(`/anchor/transaction/${id}`),
  },

  // ── Transferencias 3.0 (BCRA) — cobro en ARS ─────────────
  t3: {
    collector: () =>
      get<{ cvu: string; alias: string; name: string; city: string }>(
        "/transferencias3/collector"
      ),

    qr: (body: { amountArs: number; reference?: string }) =>
      post<{
        emv: string;
        qrImage: string;
        fields: {
          amountArs: number;
          reference: string;
          cvu: string;
          alias: string;
          merchantName: string;
          merchantCity: string;
        };
      }>("/transferencias3/qr", body),

    simulatePayment: (body: {
      amountArs: number;
      reference: string;
      payer?: string;
    }) =>
      post<{
        rail: string;
        status: string;
        bankTransactionId: string;
        coelsaId: string;
        amountArs: number;
        creditedCvu: string;
        reference: string;
        payer: string;
        timestamp: string;
        settlement: {
          settled: boolean;
          settlementAsset?: string;
          settlementAmount?: string;
          stellarTxHash?: string;
          explorerUrl?: string;
          error?: string;
        };
      }>("/transferencias3/simulate-payment", body),
  },

  // ── BlindPay (off-ramp USDC/USDB → ARS/BRL/COP) ─────────
  // La moneda fiat de destino la define el rail del bank account (transfers_bitso → ARS).
  blindpay: {
    customers: () =>
      get<Array<{ id: string; first_name: string; last_name: string; email: string; kyc_status: string }>>(
        "/blindpay/customers"
      ),

    bankAccounts: (customerId: string) =>
      get<Array<{ id: string; type: string; transfers_type: string; transfers_account: string; beneficiary_name: string; status: string }>>(
        `/blindpay/customers/${customerId}/bank-accounts`
      ),

    // Adjunta una cuenta ARS (CBU/CVU/ALIAS) a un receiver
    createBankAccount: (
      customerId: string,
      body: { transfers_type: "CBU" | "CVU" | "ALIAS"; transfers_account: string; beneficiary_name: string; name?: string }
    ) =>
      post<{ id: string; status: string; transfers_account: string }>(
        `/blindpay/customers/${customerId}/bank-accounts`,
        body
      ),

    // request_amount en MINOR UNITS (centavos). currency_type: "sender" (stablecoin) | "receiver" (ARS)
    quote: (body: {
      bank_account_id: string;
      request_amount: number;
      currency_type?: "sender" | "receiver";
      cover_fees?: boolean;
    }) =>
      post<{
        id: string;
        expires_at: number;
        sender_amount: number;      // centavos del stablecoin
        receiver_amount: number;    // centavos de ARS
        blindpay_quotation: number; // tasa ARS/USD
        commercial_quotation: number;
        flat_fee: number;
        partner_fee_amount: number;
        contract: { address: string; amount: string; network: { name: string; chainId: number } };
      }>("/blindpay/quote", body),

    authorize: (body: { quote_id: string; sender_wallet_address: string }) =>
      // BlindPay devuelve el XDR sin firmar en el campo (mal nombrado) transactionHash
      post<{ transactionHash?: string; xdr?: string; unsigned_xdr?: string }>(
        "/blindpay/authorize",
        body
      ),

    payout: (body: {
      quote_id: string;
      signed_transaction: string;
      sender_wallet_address: string;
    }) =>
      post<{ id: string; status: string; created_at: string }>("/blindpay/payout", body),
  },
};

// mantener compatibilidad con el fetchSplit que ya usabas
export async function fetchSplit(id: string) {
  return api.splits.getById(id);
}
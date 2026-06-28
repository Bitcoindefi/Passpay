import { Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  getBlindPayQuote,
  authorizeBlindPayPayout,
  createBlindPayPayout,
  getBlindPayCustomers,
  getBlindPayBankAccounts,
  createBlindPayBankAccount,
  createBlindPayReceiver,
  initiateBlindPayTos,
} from "../services/blindpay.service";

// GET /blindpay/customers
export async function blindPayCustomersController(req: Request, res: Response) {
  try {
    const customers = await getBlindPayCustomers();
    return res.json(customers);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /blindpay/quote
// body: { bank_account_id, request_amount (centavos), currency_type?, network?, token?, cover_fees? }
export async function blindPayQuoteController(req: Request, res: Response) {
  const { bank_account_id, request_amount, currency_type, network, token, cover_fees } = req.body;

  if (!bank_account_id || request_amount === undefined) {
    return res.status(400).json({ error: "bank_account_id and request_amount (in minor units) are required" });
  }

  try {
    const quote = await getBlindPayQuote({
      bank_account_id,
      request_amount: Number(request_amount),
      currency_type,
      network,
      token,
      cover_fees,
    });
    return res.json(quote);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /blindpay/authorize
export async function blindPayAuthorizeController(req: Request, res: Response) {
  const { quote_id, sender_wallet_address } = req.body;

  if (!quote_id || !sender_wallet_address) {
    return res.status(400).json({ error: "quote_id and sender_wallet_address are required" });
  }

  try {
    const result = await authorizeBlindPayPayout({ quote_id, sender_wallet_address });
    return res.json(result);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /blindpay/payout
export async function blindPayPayoutController(req: Request, res: Response) {
  const { quote_id, signed_transaction, sender_wallet_address } = req.body;

  if (!quote_id || !signed_transaction || !sender_wallet_address) {
    return res.status(400).json({ error: "quote_id, signed_transaction and sender_wallet_address are required" });
  }

  try {
    const payout = await createBlindPayPayout({ quote_id, signed_transaction, sender_wallet_address });
    return res.json(payout);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// GET /blindpay/customers/:id/bank-accounts
export async function blindPayBankAccountsController(req: Request, res: Response) {
  const id = req.params.id as string;
  try {
    const accounts = await getBlindPayBankAccounts(id);
    return res.json(accounts);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /blindpay/customers/:id/bank-accounts
// Adjunta una cuenta bancaria local a un receiver. Para ARS:
//   { transfers_type: "CBU"|"CVU"|"ALIAS", transfers_account, beneficiary_name, name? }
export async function createBlindPayBankAccountController(req: Request, res: Response) {
  const receiverId = req.params.id as string;
  const { transfers_type, transfers_account, beneficiary_name, name, type } = req.body;

  if (!transfers_account || !beneficiary_name) {
    return res.status(400).json({ error: "transfers_account and beneficiary_name are required" });
  }

  try {
    const account = await createBlindPayBankAccount(receiverId, {
      type: type ?? "transfers_bitso",
      name: name ?? `Cuenta ${transfers_type ?? "CBU"} ${beneficiary_name}`,
      beneficiary_name,
      transfers_type: (transfers_type ?? "CBU").toUpperCase(),
      transfers_account,
    });
    return res.status(201).json(account);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /blindpay/receivers — crear receiver (requiere tos_id ya aceptado)
export async function createBlindPayReceiverController(req: Request, res: Response) {
  const body = req.body;
  if (!body?.tos_id) {
    return res.status(400).json({
      error: "tos_id is required. Initiate ToS first (POST /blindpay/tos), open the returned url, accept, then create the receiver.",
    });
  }
  try {
    const receiver = await createBlindPayReceiver(body);
    return res.status(201).json(receiver);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /blindpay/tos — inicia la aceptación de Términos de Servicio (devuelve url hosted)
// idempotency_key debe ser un UUID; si no se manda, se autogenera.
export async function blindPayTosController(req: Request, res: Response) {
  const { receiver_id, redirect_url } = req.body ?? {};
  const idempotency_key = req.body?.idempotency_key ?? randomUUID();
  try {
    const result = await initiateBlindPayTos({ idempotency_key, receiver_id, redirect_url });
    return res.json({ ...result, idempotency_key });
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

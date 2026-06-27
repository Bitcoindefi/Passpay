import { Request, Response } from "express";
import { getBlindPayQuote, authorizeBlindPayPayout, createBlindPayPayout, getBlindPayCustomers, getBlindPayBankAccounts } from "../services/blindpay.service";

// GET /blindpay/customers
export async function blindPayCustomersController(req: Request, res: Response) {
  try {
    const customers = await getBlindPayCustomers();
    return res.json(customers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /blindpay/quote
export async function blindPayQuoteController(req: Request, res: Response) {
  const { amount, target_currency, receiver_id, bank_account_id } = req.body;

  if (!amount || !target_currency || !receiver_id || !bank_account_id) {
    return res.status(400).json({ error: "amount, target_currency, receiver_id and bank_account_id are required" });
  }

  try {
    const quote = await getBlindPayQuote({
      amount,
      source_currency: 'USDC',
      target_currency,
      receiver_id,
      bank_account_id,
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
    return res.status(500).json({ error: err.message });
  }
}
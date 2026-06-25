import { Request, Response } from "express";
import { z } from "zod";
import {
  getAbroadQuote,
  createAbroadTransaction,
  getAbroadTransaction,
} from "../services/abroad.service";

const QuoteSchema = z.object({
  target_currency: z.enum(["BRL", "COP"]),
  amount: z.number().positive(),
});

const TransactionSchema = z.object({
  quote_id: z.string().min(1),
  user_id: z.string().min(1),
  account_number: z.string().min(1),
  tax_id: z.string().optional(),
});

// POST /abroad/quote
export async function abroadQuoteController(req: Request, res: Response) {
  const parsed = QuoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { target_currency, amount } = parsed.data;
    const quote = await getAbroadQuote({
      target_currency,
      payment_method: target_currency === "BRL" ? "PIX" : "PSE",
      network: "STELLAR",
      crypto_currency: "USDC",
      amount,
    });
    return res.json(quote);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// POST /abroad/transaction
export async function abroadTransactionController(req: Request, res: Response) {
  const parsed = TransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const tx = await createAbroadTransaction(parsed.data);
    return res.json(tx);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}

// GET /abroad/transaction/:id
export async function abroadTransactionStatusController(req: Request, res: Response) {
  const id = req.params.id;
if (!id || Array.isArray(id)) return res.status(400).json({ error: "id is required" });

  try {
    const tx = await getAbroadTransaction(id);
    return res.json(tx);
  } catch (err: any) {
    return res.status(502).json({ error: err.message });
  }
}
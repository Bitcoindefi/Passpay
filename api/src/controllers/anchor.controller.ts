import { Request, Response } from "express";
import { z } from "zod";
import {
  fetchAnchorInfo,
  startInteractive,
  getRampTransaction,
} from "../services/anchor.service";

const StartRampSchema = z.object({
  direction: z.enum(["deposit", "withdraw"], {
    message: "direction must be 'deposit' or 'withdraw'",
  }),
  amount: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)])
    .optional(),
});

const TxIdParamSchema = z.object({
  id: z.string().min(1, "id is required"),
});

// GET /anchor/info — qué anchor y qué assets/fiat soporta la rampa
export async function getAnchorInfoController(_req: Request, res: Response) {
  try {
    const info = await fetchAnchorInfo();
    res.json({
      name: info.name,
      homeDomain: info.homeDomain,
      assetCode: info.assetCode,
      fiatCurrency: info.fiatCurrency,
      networkPassphrase: info.networkPassphrase,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
}

// POST /anchor/ramp — inicia depósito (fiat→USDC) o retiro (USDC→fiat) interactivo
export async function startRampController(req: Request, res: Response) {
  const parsed = StartRampSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { direction, amount } = parsed.data;
    const { info, ramp, account } = await startInteractive(
      direction,
      amount !== undefined ? String(amount) : undefined
    );
    res.json({
      anchor: info.name,
      assetCode: info.assetCode,
      fiatCurrency: info.fiatCurrency,
      account,
      direction,
      transactionId: ramp.id,
      interactiveUrl: ramp.url,
      type: ramp.type,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
}

// GET /anchor/transaction/:id — estado de una transacción de rampa (polling)
export async function getRampTransactionController(req: Request, res: Response) {
  const parsed = TxIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const MAX_RETRIES = 3;
    const BACKOFF_MS = [1000, 2000, 4000];

    let tx = await getRampTransaction(parsed.data.id);

    for (let attempt = 0; attempt < MAX_RETRIES && tx.status === "error"; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
      tx = await getRampTransaction(parsed.data.id);
    }

    if (tx.status === "error") {
      return res.status(502).json({
        error: "Anchor reported error after 3 retries",
        lastStatus: "error",
        message: tx.message ?? undefined,
      });
    }

    res.json(tx);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
}

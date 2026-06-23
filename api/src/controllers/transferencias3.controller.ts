import { Request, Response } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import {
  generateInteroperableQR,
  simulateInboundPayment,
  collectorAccount,
} from "../services/transferencias3.service";

const GenerateQrSchema = z.object({
  amountArs: z.number().positive("amountArs must be greater than 0"),
  reference: z.string().min(1).max(25).optional(),
});

const SimulatePaymentSchema = z.object({
  amountArs: z.number().positive("amountArs must be greater than 0"),
  reference: z.string().min(1).max(25),
  payer: z.string().min(1).optional(),
});

// GET /transferencias3/collector — CVU/alias del comercio recaudador
export function getCollectorController(_req: Request, res: Response) {
  res.json(collectorAccount());
}

// POST /transferencias3/qr — genera el QR interoperable EMVCo para un monto ARS
export async function generateT3QrController(req: Request, res: Response) {
  const parsed = GenerateQrSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const reference = parsed.data.reference ?? `PP-${Date.now().toString(36)}`;
    const qr = generateInteroperableQR(parsed.data.amountArs, reference);
    const qrImage = await QRCode.toDataURL(qr.emv);
    res.json({ ...qr, qrImage });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// POST /transferencias3/simulate-payment — pagador simulado abona el QR
// (Coelsa acredita ARS) y Passpay liquida on-chain en Stellar.
export async function simulateT3PaymentController(req: Request, res: Response) {
  const parsed = SimulatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const receipt = await simulateInboundPayment(parsed.data);
    res.json(receipt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

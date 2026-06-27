// Construye una transacción Stellar sin firmar para que el cliente la firme con su wallet
// El cliente firma con Freighter y después la broadcastea via POST /:id/tx/submit

import { Request, Response } from "express";
import StellarSdk from "@stellar/stellar-sdk";
import { prisma } from "../lib/prisma";

const server = new StellarSdk.Horizon.Server(
  process.env.STELLAR_HORIZON_URL_TESTNET ?? "https://horizon-testnet.stellar.org"
);

const { TransactionBuilder, Networks, Operation, Asset } = StellarSdk;

// GET /splits/:id/tx?payerAddress=G...&amount=100&asset=XLM
export async function buildPaymentTxController(req: Request, res: Response) {
  const { id } = req.params;
  const payerAddress = req.query.payerAddress as string | undefined;
  const amount = req.query.amount as string | undefined;
  const asset = req.query.asset as string | undefined;

  if (!payerAddress || !amount || !asset) {
    return res.status(400).json({ error: "payerAddress, amount and asset are required" });
  }

  const split = await prisma.split.findUnique({ where: { id: id as string } });
  if (!split) return res.status(404).json({ error: "Split not found" });

  const MERCHANT_PUBLIC = process.env.MERCHANT_PUBLIC!;

  try {
    const account = await server.loadAccount(payerAddress);

    const stellarAsset = asset === 'XLM'
      ? Asset.native()
      : new Asset(asset, process.env.ISSUER_PUBLIC_ASSET!);

    const transaction = new TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: MERCHANT_PUBLIC,
        asset: stellarAsset,
        amount: amount,
      }))
      .setTimeout(180)
      .build();

    return res.json({
      xdr: transaction.toXDR(),
      splitId: id,
      expectedHash: transaction.hash().toString('hex'),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /splits/:id/tx/submit — recibe el XDR firmado y lo broadcastea
export async function submitPaymentTxController(req: Request, res: Response) {
  const { id } = req.params;
  const { signedXdr } = req.body;

  if (!signedXdr) return res.status(400).json({ error: "signedXdr is required" });

  try {
    const tx = new StellarSdk.Transaction(signedXdr, Networks.TESTNET);
    const result = await server.submitTransaction(tx);
    console.log('[stellar-tx] result:', JSON.stringify(result).slice(0, 200));
    console.log('[stellar-tx] hash:', result.hash);
    return res.json({
      txHash: result.hash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
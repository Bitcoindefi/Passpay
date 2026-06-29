import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

type PaymentType = "T3" | "anchor" | "split";

interface HistoryItem {
  id: string;
  type: PaymentType;
  status: string;
  amount: string | null;
  asset: string | null;
  createdAt: Date;
  stellarTxHash?: string | null;
}

export async function getPaymentHistoryController(req: Request, res: Response) {
  const { merchantId, from, to, type, status } = req.query as Record<string, string | undefined>;

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        }
      : {};

  try {
    const results: HistoryItem[] = [];

    if (!type || type === "T3") {
      const rows = await prisma.t3Transaction.findMany({
        where: {
          ...(status ? { status } : {}),
          ...dateFilter,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const r of rows) {
        results.push({
          id: r.id,
          type: "T3",
          status: r.status,
          amount: r.amountArs.toString(),
          asset: "ARS",
          createdAt: r.createdAt,
          stellarTxHash: r.stellarTxHash,
        });
      }
    }

    if (!type || type === "anchor") {
      const rows = await prisma.anchorTransaction.findMany({
        where: {
          ...(status ? { status } : {}),
          ...dateFilter,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const r of rows) {
        results.push({
          id: r.id,
          type: "anchor",
          status: r.status,
          amount: r.amount ?? null,
          asset: r.assetCode ?? null,
          createdAt: r.createdAt,
        });
      }
    }

    if (!type || type === "split") {
      const rows = await prisma.payment.findMany({
        where: {
          ...(status ? { externalStatus: status } : {}),
          ...dateFilter,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const r of rows) {
        results.push({
          id: r.id,
          type: "split",
          status: r.externalStatus,
          amount: r.originalAmount.toString(),
          asset: r.originalAsset,
          createdAt: r.createdAt,
        });
      }
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

import { Router } from "express";
import {
  abroadQuoteController,
  abroadTransactionController,
  abroadTransactionStatusController,
} from "../controllers/abroad.controller";

const router = Router();

// POST /abroad/quote — obtener cotización USDC→BRL/COP
router.post("/quote", abroadQuoteController);

// POST /abroad/transaction — crear off-ramp
router.post("/transaction", abroadTransactionController);

// GET /abroad/transaction/:id — consultar estado
router.get("/transaction/:id", abroadTransactionStatusController);

export default router;
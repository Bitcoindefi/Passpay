import { Router } from "express";
import { getPaymentHistoryController } from "../controllers/payment-history.controller";

const router = Router();

router.get("/", getPaymentHistoryController);

export default router;

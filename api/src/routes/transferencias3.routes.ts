import { Router } from "express";
import {
  getCollectorController,
  generateT3QrController,
  simulateT3PaymentController,
} from "../controllers/transferencias3.controller";

const router = Router();

router.get("/collector", getCollectorController);
router.post("/qr", generateT3QrController);
router.post("/simulate-payment", simulateT3PaymentController);

export default router;

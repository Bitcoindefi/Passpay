import { Router } from "express";
import {
  getAnchorInfoController,
  startRampController,
  getRampTransactionController,
} from "../controllers/anchor.controller";

const router = Router();

router.get("/info", getAnchorInfoController);
router.post("/ramp", startRampController);
router.get("/transaction/:id", getRampTransactionController);

export default router;

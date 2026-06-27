import { Router } from "express";
import {
  blindPayCustomersController,
  blindPayQuoteController,
  blindPayAuthorizeController,
  blindPayPayoutController,
  blindPayBankAccountsController,
} from "../controllers/blindpay.controller";

const router = Router();

router.get("/customers", blindPayCustomersController);
router.post("/quote", blindPayQuoteController);
router.post("/authorize", blindPayAuthorizeController);
router.post("/payout", blindPayPayoutController);
router.get("/customers/:id/bank-accounts", blindPayBankAccountsController);

export default router;
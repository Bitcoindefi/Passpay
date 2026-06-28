import { Router } from "express";
import {
  blindPayCustomersController,
  blindPayQuoteController,
  blindPayAuthorizeController,
  blindPayPayoutController,
  blindPayBankAccountsController,
  createBlindPayBankAccountController,
  createBlindPayReceiverController,
  blindPayTosController,
} from "../controllers/blindpay.controller";

const router = Router();

// Receivers
router.get("/customers", blindPayCustomersController);
router.post("/receivers", createBlindPayReceiverController);
router.post("/tos", blindPayTosController);

// Bank accounts
router.get("/customers/:id/bank-accounts", blindPayBankAccountsController);
router.post("/customers/:id/bank-accounts", createBlindPayBankAccountController);

// Off-ramp flow
router.post("/quote", blindPayQuoteController);
router.post("/authorize", blindPayAuthorizeController);
router.post("/payout", blindPayPayoutController);

export default router;

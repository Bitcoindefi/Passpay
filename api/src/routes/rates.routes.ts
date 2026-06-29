import { Router } from "express";
import { getArsPerUsd } from "../services/rate.service";

const router = Router();

// GET /rates/ars-usd → { arsPerUsd, source: "BCRA"|"fallback", asOf }
router.get("/ars-usd", async (_req, res) => {
  const rate = await getArsPerUsd();
  res.json(rate);
});

export default router;

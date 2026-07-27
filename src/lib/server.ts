import { Router } from "express";

const router = Router();

export const pendingWebhooks: any[] = [];

// Server webhooks disabled - using native Android Capacitor capture exclusively
router.get("/api/webhooks/pending", (_req, res) => {
  return res.status(200).json({ webhooks: [] });
});

export default router;


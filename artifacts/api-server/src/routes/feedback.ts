import { Router, type IRouter } from "express";
import { SubmitFeedbackBody } from "@workspace/api-zod";
import { feedbackTable, getDb } from "@workspace/db";

const router: IRouter = Router();

router.post("/feedback", async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid feedback payload" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Feedback storage is not configured." });
    return;
  }

  const { rating, comment, feature, company } = parsed.data;

  try {
    await db.insert(feedbackTable).values({
      rating,
      comment: comment?.trim() || null,
      feature,
      company: company?.trim() || null,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save feedback");
    res.status(500).json({ error: "Could not save feedback. Please try again." });
  }
});

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import betaRouter from "./beta";
import feedbackRouter from "./feedback";
import accountBriefRouter from "./account-brief";
import nextTouchRouter from "./next-touch";
import accountMapRouter from "./account-map";
import accountSignalsRouter from "./account-signals";
import yourCompanyRouter from "./your-company";

const router: IRouter = Router();

router.use(healthRouter);
router.use(betaRouter);
router.use(feedbackRouter);
router.use(yourCompanyRouter);
router.use(accountBriefRouter);
router.use(accountMapRouter);
router.use(nextTouchRouter);
router.use(accountSignalsRouter);

export default router;

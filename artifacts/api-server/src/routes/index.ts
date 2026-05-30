import { Router, type IRouter } from "express";
import healthRouter from "./health";
import icpsRouter from "./icps";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";
import accountBriefRouter from "./account-brief";
import nextTouchRouter from "./next-touch";
import accountMapRouter from "./account-map";
import accountSignalsRouter from "./account-signals";
import marketProspectRouter from "./market-prospect";
import yourCompanyRouter from "./your-company";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(icpsRouter);
router.use(signalsRouter);
router.use(yourCompanyRouter);
router.use(accountBriefRouter);
router.use(accountMapRouter);
router.use(nextTouchRouter);
router.use(accountSignalsRouter);
router.use(marketProspectRouter);

export default router;

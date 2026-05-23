import { Router, type IRouter } from "express";
import healthRouter from "./health";
import competitorsRouter from "./competitors";
import icpsRouter from "./icps";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";
import accountBriefRouter from "./account-brief";
import marketProspectRouter from "./market-prospect";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(competitorsRouter);
router.use(icpsRouter);
router.use(signalsRouter);
router.use(accountBriefRouter);
router.use(marketProspectRouter);

export default router;

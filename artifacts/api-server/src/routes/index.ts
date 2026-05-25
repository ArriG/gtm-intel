import { Router, type IRouter } from "express";
import healthRouter from "./health";
import icpsRouter from "./icps";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";
import accountBriefRouter from "./account-brief";
import marketProspectRouter from "./market-prospect";
import signalRadarRouter from "./signal-radar";
import researchSourcePlanRouter from "./research-source-plan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(icpsRouter);
router.use(signalsRouter);
router.use(signalRadarRouter);
router.use(researchSourcePlanRouter);
router.use(accountBriefRouter);
router.use(marketProspectRouter);

export default router;

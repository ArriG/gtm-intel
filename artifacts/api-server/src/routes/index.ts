import { Router, type IRouter } from "express";
import healthRouter from "./health";
import competitorsRouter from "./competitors";
import icpsRouter from "./icps";
import battlecardsRouter from "./battlecards";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";
import accountBriefRouter from "./account-brief";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(competitorsRouter);
router.use(icpsRouter);
router.use(battlecardsRouter);
router.use(signalsRouter);
router.use(accountBriefRouter);

export default router;

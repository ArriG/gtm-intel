import { Router, type IRouter } from "express";
import healthRouter from "./health";
import competitorsRouter from "./competitors";
import icpsRouter from "./icps";
import battlecardsRouter from "./battlecards";
import signalsRouter from "./signals";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(competitorsRouter);
router.use(icpsRouter);
router.use(battlecardsRouter);
router.use(signalsRouter);

export default router;

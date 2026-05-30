import { Router, type IRouter } from "express";
import healthRouter from "./health";
import icpsRouter from "./icps";
import accountBriefRouter from "./account-brief";
import nextTouchRouter from "./next-touch";
import accountMapRouter from "./account-map";
import accountSignalsRouter from "./account-signals";
import marketProspectRouter from "./market-prospect";
import yourCompanyRouter from "./your-company";

const router: IRouter = Router();

router.use(healthRouter);
router.use(icpsRouter);
router.use(yourCompanyRouter);
router.use(accountBriefRouter);
router.use(accountMapRouter);
router.use(nextTouchRouter);
router.use(accountSignalsRouter);
router.use(marketProspectRouter);

export default router;

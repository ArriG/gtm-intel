import { Router, type IRouter } from "express";
import { handleSignalRadar } from "../lib/signal-radar-handler";

const router: IRouter = Router();

router.post("/signal-radar", handleSignalRadar);
router.post("/signals/scan", handleSignalRadar);

export default router;

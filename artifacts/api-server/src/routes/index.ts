import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workersRouter from "./workers";
import worksitesRouter from "./worksites";
import jobsRouter from "./jobs";
import timesheetsRouter from "./timesheets";
import messagesRouter from "./messages";
import exportsRouter from "./exports";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workersRouter);
router.use(worksitesRouter);
router.use(jobsRouter);
router.use(timesheetsRouter);
router.use(messagesRouter);
router.use(exportsRouter);
router.use(seedRouter);

export default router;

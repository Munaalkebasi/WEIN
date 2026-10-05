import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { createPlansRouter, type PlansDatabase } from "./plans";

export function createRouter(database: PlansDatabase): IRouter {
  const router: IRouter = Router();

  router.use(healthRouter);
  router.use(createPlansRouter(database));

  return router;
}

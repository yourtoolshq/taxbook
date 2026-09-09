import { employmentRouter } from "~/server/api/routers/employment";
import { paychequeRouter } from "~/server/api/routers/paycheque";
import { recordRouter } from "~/server/api/routers/record";
import { settingsRouter } from "~/server/api/routers/settings";
import { setupRouter } from "~/server/api/routers/setup";
import { taxItemRouter } from "~/server/api/routers/tax-item";
import { taxYearRouter } from "~/server/api/routers/tax-year";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  employment: employmentRouter,
  paycheque: paychequeRouter,
  record: recordRouter,
  settings: settingsRouter,
  setup: setupRouter,
  taxItem: taxItemRouter,
  taxYear: taxYearRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);

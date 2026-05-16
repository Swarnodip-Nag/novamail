import { authRouter } from "./auth-router";
import { accountRouter } from "./routers/account-router";
import { emailRouter } from "./routers/email-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  account: accountRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;

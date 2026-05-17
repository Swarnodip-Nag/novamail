import { authRouter } from "./auth-router.js";
import { accountRouter } from "./routers/account-router.js";
import { emailRouter } from "./routers/email-router.js";
import { createRouter, publicQuery } from "./middleware.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  account: accountRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;

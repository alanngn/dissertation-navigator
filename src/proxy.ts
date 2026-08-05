import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share(.*)",
]);

function hasValidBackfillSecret(req: Request): boolean {
  const secret = process.env.BACKFILL_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export default clerkMiddleware(async (auth, req) => {
  // Allow bearer-token backfill calls through before Clerk auth.protect().
  if (
    req.nextUrl.pathname === "/api/admin/backfill-agents" &&
    hasValidBackfillSecret(req)
  ) {
    return;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

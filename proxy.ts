import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { MAINTENANCE_HTML } from "@/lib/maintenance-page";

// Next 16 renamed `middleware` -> `proxy` (nodejs runtime, no edge).
// clerkMiddleware must run on every non-static route so server components and
// Convex get the auth token; we additionally gate the private areas.
const isProtectedRoute = createRouteMatcher(["/account(.*)", "/admin(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  // Pre-launch holding page. Set MAINTENANCE_MODE="true" in the PRODUCTION
  // environment only; leave it unset in dev to see the real site. Flip it off
  // (or remove it) to go live.
  if (process.env.MAINTENANCE_MODE === "true") {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "3600",
        "cache-control": "no-store",
      },
    });
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};

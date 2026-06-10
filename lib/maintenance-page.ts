// Standalone "coming soon" holding page served by proxy.ts when
// MAINTENANCE_MODE is on. Self-contained (inline styles, no app layout) so it
// works for every route and needs no Convex/Clerk/assets.
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Amara — Coming soon</title>
<style>
  :root { --bone:#f4f1ea; --forest:#1f3d2b; --clay:#c56a45; --ink:#14241a; --muted:#5b6b5f; }
  * { box-sizing:border-box; margin:0; }
  html,body { height:100%; }
  body {
    display:flex; align-items:center; justify-content:center; padding:24px;
    background:var(--bone); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  .card { max-width:520px; text-align:center; }
  .eyebrow { font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:var(--clay); font-weight:600; }
  h1 { margin:16px 0 0; font-size:clamp(30px,6vw,44px); line-height:1.05; letter-spacing:-.01em; color:var(--forest); font-weight:600; }
  p { margin:20px auto 0; max-width:380px; line-height:1.65; color:var(--muted); font-size:15px; }
  .rule { width:40px; height:3px; border-radius:3px; background:var(--clay); margin:28px auto 0; }
</style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Amara</p>
    <h1>Something lovely is on the way</h1>
    <p>Our clean, plant-led beauty store is putting on the finishing touches. We'll be open very soon — thank you for your patience.</p>
    <div class="rule"></div>
  </main>
</body>
</html>`;

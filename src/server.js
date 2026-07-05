import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";

import { config } from "./config.js";
import { connectDb } from "./db.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { inquiriesRouter } from "./routes/inquiries.js";
import { mediaRouter } from "./routes/media.js";
import { navigationRouter } from "./routes/navigation.js";
import { pagesRouter } from "./routes/pages.js";
import { productsRouter } from "./routes/products.js";
import { settingsRouter } from "./routes/settings.js";
import { suppliersRouter } from "./routes/suppliers.js";

export const app = express();
let dbReady = false;
let dbError = null;

const apiGroups = [
  {
    name: "Auth",
    endpoints: [
      { method: "POST", path: "/api/auth/login", auth: "Public", note: "Admin login" },
      { method: "GET", path: "/api/auth/me", auth: "Admin", note: "Current admin profile" },
      { method: "PATCH", path: "/api/auth/password", auth: "Admin", note: "Change admin password" },
    ],
  },
  {
    name: "Categories",
    endpoints: [
      { method: "GET", path: "/api/categories", auth: "Public", note: "List product categories" },
      { method: "POST", path: "/api/categories", auth: "Admin", note: "Create category" },
      { method: "PUT", path: "/api/categories/:id", auth: "Admin", note: "Update category" },
      { method: "DELETE", path: "/api/categories/:id", auth: "Admin", note: "Delete category" },
    ],
  },
  {
    name: "Products",
    endpoints: [
      { method: "GET", path: "/api/products", auth: "Public", note: "List products" },
      { method: "GET", path: "/api/products/:slug", auth: "Public", note: "Single product" },
      { method: "POST", path: "/api/products", auth: "Admin", note: "Create product" },
      { method: "PUT", path: "/api/products/:id", auth: "Admin", note: "Update product" },
      { method: "DELETE", path: "/api/products/:id", auth: "Admin", note: "Delete product" },
    ],
  },
  {
    name: "Pages",
    endpoints: [
      { method: "GET", path: "/api/pages", auth: "Public", note: "List CMS pages" },
      { method: "GET", path: "/api/pages/:slug", auth: "Public", note: "Single CMS page" },
      { method: "POST", path: "/api/pages", auth: "Admin", note: "Create page" },
      { method: "PUT", path: "/api/pages/:id", auth: "Admin", note: "Update page" },
      { method: "DELETE", path: "/api/pages/:id", auth: "Admin", note: "Delete page" },
    ],
  },
  {
    name: "Settings",
    endpoints: [
      { method: "GET", path: "/api/settings", auth: "Public", note: "Site settings" },
      { method: "PUT", path: "/api/settings", auth: "Admin", note: "Update settings" },
    ],
  },
  {
    name: "Media",
    endpoints: [
      { method: "GET", path: "/api/media", auth: "Admin", note: "List uploaded media" },
      { method: "POST", path: "/api/media/upload", auth: "Admin", note: "Upload to Cloudinary" },
      { method: "DELETE", path: "/api/media/:id", auth: "Admin", note: "Delete media" },
    ],
  },
  {
    name: "Navigation",
    endpoints: [
      { method: "GET", path: "/api/navigation", auth: "Public", note: "Header/footer navigation" },
      { method: "POST", path: "/api/navigation", auth: "Admin", note: "Create nav item" },
      { method: "PUT", path: "/api/navigation/:id", auth: "Admin", note: "Update nav item" },
      { method: "DELETE", path: "/api/navigation/:id", auth: "Admin", note: "Delete nav item" },
    ],
  },
  {
    name: "Inquiries",
    endpoints: [
      { method: "POST", path: "/api/inquiries", auth: "Public", note: "Submit contact inquiry" },
      { method: "GET", path: "/api/inquiries", auth: "Admin", note: "List inquiries" },
      { method: "PATCH", path: "/api/inquiries/:id/status", auth: "Admin", note: "Update inquiry status" },
    ],
  },
  {
    name: "Suppliers",
    endpoints: [
      { method: "POST", path: "/api/suppliers", auth: "Public", note: "Submit supplier application" },
      { method: "GET", path: "/api/suppliers", auth: "Admin", note: "List supplier applications" },
      { method: "PATCH", path: "/api/suppliers/:id/status", auth: "Admin", note: "Update supplier status" },
    ],
  },
  {
    name: "Status",
    endpoints: [
      { method: "GET", path: "/", auth: "Public", note: "Browser status dashboard" },
      { method: "GET", path: "/api/status", auth: "Public", note: "Browser status dashboard" },
      { method: "GET", path: "/api/status.json", auth: "Public", note: "JSON status payload" },
      { method: "GET", path: "/api/health", auth: "Public", note: "Health check" },
    ],
  },
];

async function ensureDb() {
  try {
    await connectDb();
    dbReady = true;
    dbError = null;
    return true;
  } catch (error) {
    dbReady = false;
    dbError = error.message;
    return false;
  }
}

function getDbState() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}

async function getStatusPayload() {
  const connected = await ensureDb();
  return {
    ok: connected,
    service: "Fashion Source BD API",
    environment: config.nodeEnv,
    port: config.port,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: connected ? "connected" : "not_connected",
      state: getDbState(),
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
      error: connected ? null : dbError,
    },
    config: {
      clientOrigins: config.clientOrigins,
      cloudinary: {
        cloudNameConfigured: Boolean(config.cloudinary.cloudName),
        apiKeyConfigured: Boolean(config.cloudinary.apiKey),
        apiSecretConfigured: Boolean(config.cloudinary.apiSecret),
        folder: config.cloudinary.folder,
      },
      mongodbUriConfigured: Boolean(config.mongodbUri),
      jwtSecretConfigured: Boolean(config.jwtSecret),
    },
    apiGroups,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStatusPage(status) {
  const endpointRows = status.apiGroups
    .map(
      (group) => `
        <section class="card">
          <h2>${escapeHtml(group.name)}</h2>
          <div class="rows">
            ${group.endpoints
              .map(
                (endpoint) => `
                  <div class="row">
                    <span class="method ${endpoint.method.toLowerCase()}">${escapeHtml(endpoint.method)}</span>
                    <code>${escapeHtml(endpoint.path)}</code>
                    <span class="auth">${escapeHtml(endpoint.auth)}</span>
                    <span class="note">${escapeHtml(endpoint.note)}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");

  const configItems = [
    ["MongoDB URI", status.config.mongodbUriConfigured ? "Configured" : "Missing"],
    ["JWT Secret", status.config.jwtSecretConfigured ? "Configured" : "Missing"],
    ["Cloudinary Cloud", status.config.cloudinary.cloudNameConfigured ? "Configured" : "Missing"],
    ["Cloudinary API Key", status.config.cloudinary.apiKeyConfigured ? "Configured" : "Missing"],
    ["Cloudinary API Secret", status.config.cloudinary.apiSecretConfigured ? "Configured" : "Missing"],
    ["Cloudinary Folder", status.config.cloudinary.folder],
    ["Allowed Frontend Origins", status.config.clientOrigins.join(", ")],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(status.service)} Status</title>
  <style>
    :root { color-scheme: dark; --bg: #101418; --panel: #171d23; --line: rgba(255,255,255,.1); --muted: rgba(255,255,255,.62); --green: #37ac4e; --red: #ff5f57; --amber: #f0b429; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: white; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 56px; }
    .hero { display: grid; gap: 18px; padding: 28px; border: 1px solid var(--line); background: linear-gradient(135deg, rgba(55,172,78,.14), rgba(255,255,255,.035)); }
    h1 { margin: 0; font-size: clamp(28px, 5vw, 54px); line-height: 1; }
    h2 { margin: 0 0 18px; font-size: 15px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); }
    p { margin: 0; color: var(--muted); line-height: 1.7; }
    .badges { display: flex; flex-wrap: wrap; gap: 10px; }
    .badge { display: inline-flex; gap: 8px; align-items: center; border: 1px solid var(--line); background: rgba(255,255,255,.05); padding: 9px 12px; font-size: 13px; font-weight: 800; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: ${status.ok ? "var(--green)" : "var(--red)"}; box-shadow: 0 0 24px ${status.ok ? "rgba(55,172,78,.75)" : "rgba(255,95,87,.65)"}; }
    .grid { display: grid; gap: 18px; margin-top: 18px; }
    @media (min-width: 860px) { .grid.two { grid-template-columns: 1fr 1fr; } }
    .card { border: 1px solid var(--line); background: var(--panel); padding: 22px; }
    .kv { display: grid; gap: 12px; }
    .kv div, .row { display: grid; gap: 8px; align-items: center; border-top: 1px solid var(--line); padding: 12px 0 0; }
    .kv div:first-child, .row:first-child { border-top: 0; padding-top: 0; }
    .kv strong { color: white; }
    .kv span { color: var(--muted); word-break: break-word; }
    .rows { display: grid; gap: 0; }
    .row { grid-template-columns: 72px minmax(0, 1fr); }
    @media (min-width: 760px) { .row { grid-template-columns: 72px minmax(260px, 1fr) 80px minmax(180px, .8fr); } }
    code { color: white; font-size: 13px; white-space: normal; word-break: break-word; }
    .method { justify-self: start; min-width: 58px; padding: 5px 8px; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: .08em; }
    .get { background: rgba(55,172,78,.16); color: #77dc89; }
    .post { background: rgba(240,180,41,.16); color: #ffd36d; }
    .put, .patch { background: rgba(89,155,255,.16); color: #98c0ff; }
    .delete { background: rgba(255,95,87,.16); color: #ff9a94; }
    .auth, .note { color: var(--muted); font-size: 13px; }
    a { color: #77dc89; }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="badges">
        <span class="badge"><span class="dot"></span>${status.ok ? "Backend Live" : "Backend Degraded"}</span>
        <span class="badge">MongoDB: ${escapeHtml(status.database.status)}</span>
        <span class="badge">Port: ${escapeHtml(status.port)}</span>
      </div>
      <h1>${escapeHtml(status.service)}</h1>
      <p>Browser status dashboard for the local backend. JSON version: <a href="/api/status.json">/api/status.json</a>. Health check: <a href="/api/health">/api/health</a>.</p>
    </section>

    <div class="grid two">
      <section class="card">
        <h2>Runtime</h2>
        <div class="kv">
          <div><strong>Environment</strong><span>${escapeHtml(status.environment)}</span></div>
          <div><strong>Uptime</strong><span>${escapeHtml(status.uptimeSeconds)} seconds</span></div>
          <div><strong>Checked At</strong><span>${escapeHtml(status.timestamp)}</span></div>
        </div>
      </section>
      <section class="card">
        <h2>MongoDB</h2>
        <div class="kv">
          <div><strong>Status</strong><span>${escapeHtml(status.database.status)}</span></div>
          <div><strong>Driver State</strong><span>${escapeHtml(status.database.state)}</span></div>
          <div><strong>Database</strong><span>${escapeHtml(status.database.name || "Not available")}</span></div>
          <div><strong>Host</strong><span>${escapeHtml(status.database.host || "Not available")}</span></div>
          ${status.database.error ? `<div><strong>Error</strong><span>${escapeHtml(status.database.error)}</span></div>` : ""}
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:18px">
      <h2>Config Status</h2>
      <div class="kv">
        ${configItems
          .map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`)
          .join("")}
      </div>
    </section>

    <div class="grid">
      ${endpointRows}
    </div>
  </main>
</body>
</html>`;
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get(["/", "/api/status"], async (req, res) => {
  const status = await getStatusPayload();
  res.status(status.ok ? 200 : 503).type("html").send(renderStatusPage(status));
});

app.get("/api/status.json", async (req, res) => {
  const status = await getStatusPayload();
  res.status(status.ok ? 200 : 503).json(status);
});

app.get("/api", (req, res) => {
  res.json({
    service: "Fashion Source BD API",
    ok: true,
    database: dbReady ? "connected" : "not_connected",
    health: "/api/health",
    status: "/api/status",
    statusJson: "/api/status.json",
    apiGroups,
  });
});

app.get("/api/health", async (req, res) => {
  const connected = await ensureDb();
  res.status(connected ? 200 : 503).json({
    ok: connected,
    service: "Fashion Source BD API",
    database: connected ? "connected" : "not_connected",
    error: connected ? null : dbError,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/navigation", navigationRouter);
app.use("/api/inquiries", inquiriesRouter);
app.use("/api/suppliers", suppliersRouter);

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  await ensureDb();
  if (!process.env.VERCEL) {
    app.listen(config.port, () => {
      console.log(`Fashion Source BD API running on http://localhost:${config.port}`);
      if (!dbReady) console.log(`MongoDB not connected yet: ${dbError}`);
    });
  }
}

export default app;

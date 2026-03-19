import { Scalar } from "@scalar/hono-api-reference";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { openAPIRouteHandler } from "hono-openapi";
import { pathToFileURL } from "node:url";
import z from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";

import { auth } from "@/lib/auth";
import { authMiddleware } from "@/middleware/auth";
import { ApiKeyRoutes } from "@/routes/api-keys";
import { AreaRoutes } from "@/routes/areas";
import { ChecklistItemRoutes } from "@/routes/checklist-items";
import { EventRoutes } from "@/routes/events";
import { HeadingRoutes } from "@/routes/headings";
import { ProjectRoutes } from "@/routes/projects";
import { RepeatingRuleRoutes } from "@/routes/repeating-rules";
import { TagRoutes } from "@/routes/tags";
import { TaskRoutes } from "@/routes/tasks";
import { ViewRoutes } from "@/routes/views";

const isProd = process.env.NODE_ENV === "production";

export const app = new Hono();

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Log all non-GET requests and errors
  if (method !== "GET" || status >= 400) {
    console.log(`[${method}] ${path} ${status} ${duration}ms`);
  }
});

// Error logging middleware
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: "Internal Server Error" }, 500);
});

// CORS configuration for SPA
app.use(
  "/*",
  cors({
    origin: isProd
      ? [process.env.BASE_URL || "http://localhost:3000"]
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
);

// API routes
const api = new Hono();

api.get("/", (c) => {
  return c.text("Things API Server. API at /api, docs at /api/docs");
});

// Health check (public)
api.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OpenAPI spec
api.get(
  "/openapi.json",
  openAPIRouteHandler(api, {
    documentation: {
      info: {
        title: "Things API",
        version: "1.0.0",
        description: "REST API for Things.",
      },
      openapi: "3.1.1",
      tags: [
        {
          name: "Events",
          description: "Server-Sent Events for real-time updates",
        },
        {
          name: "Views",
          description: "Pre-filtered task views (Today, Inbox, Upcoming, etc.)",
        },
        { name: "Tasks", description: "Task management endpoints" },
        { name: "Projects", description: "Project management endpoints" },
        { name: "Areas", description: "Area management endpoints" },
        { name: "Tags", description: "Tag management endpoints" },
        {
          name: "Checklist Items",
          description: "Checklist item management endpoints",
        },
        {
          name: "Headings",
          description: "Project heading management endpoints",
        },
        {
          name: "Repeating Rules",
          description: "Repeating task rule management endpoints",
        },
      ],
      servers: [{ url: "/api", description: "API Server" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "API Key",
            description: "API key authentication. Format: sk_live_xxxxx",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  }),
);

// API Docs UI (Scalar)
api.get(
  "/docs",
  Scalar({
    url: "/api/openapi.json",
    pageTitle: "Things API",
    theme: "purple",
  }),
);

// Mount protected routes
api.use("/v1/*", authMiddleware);
api.route("/v1/event", EventRoutes());
api.route("/v1/views", ViewRoutes());
api.route("/v1/tasks", TaskRoutes());
api.route("/v1/tasks/:taskId/checklist", ChecklistItemRoutes());
api.route("/v1/projects", ProjectRoutes());
api.route("/v1/areas", AreaRoutes());
api.route("/v1/tags", TagRoutes());
api.route("/v1/headings", HeadingRoutes());
api.route("/v1/repeating-rules", RepeatingRuleRoutes());

// Mount API at /api
app.route("/api", api);

// API keys route (session-authenticated, not API key authenticated)
app.route("/api/auth/api-key", ApiKeyRoutes());

// Account management (session-authenticated)
const UpdateEmailSchema = z.object({ email: z.string().email() });

app.post("/api/auth/account/email", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = UpdateEmailSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid email" }, 400);
  }

  try {
    const result = await db
      .update(users)
      .set({
        email: parsed.data.email,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning();

    if (!result.length) {
      return c.json({ error: "Failed to update email" }, 500);
    }

    return c.json({ email: parsed.data.email }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return c.json({ error: "Email already in use" }, 409);
    }
    console.error("[Auth] update email error:", e);
    return c.json({ error: "Failed to update email" }, 500);
  }
});

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Serve static files in production
if (isProd) {
  app.use("/*", serveStatic({ root: "./dist/static" }));
  app.get("*", serveStatic({ path: "./dist/static/index.html" }));
} else {
  // In development, proxy non-API requests to Vite dev server
  const VITE_DEV_SERVER = "http://localhost:5173";

  app.all("*", async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${VITE_DEV_SERVER}${url.pathname}${url.search}`;

    try {
      const response = await fetch(targetUrl, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body:
          c.req.method !== "GET" && c.req.method !== "HEAD"
            ? c.req.raw.body
            : undefined,
      });

      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch {
      return c.text(
        "Vite dev server not running. Start it with: cd packages/web && vp run dev",
        502,
      );
    }
  });
}

export function startServer(
  port = process.env.PORT ? Number(process.env.PORT) : 3000,
) {
  return serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const server = startServer(port);
  const address = server.address();
  const value = !address || typeof address === "string" ? port : address.port;
  console.log(`Started server: http://0.0.0.0:${value}`);
}

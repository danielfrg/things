import { generateSpecs } from "hono-openapi"
import { app } from "../src/index"

// Generate OpenAPI spec for SDK generation
const spec = await generateSpecs(app, {
  documentation: {
    info: {
      title: "Things API",
      version: "1.0.0",
      description: "REST API Things",
    },
    openapi: "3.1.1",
    tags: [
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
      { name: "Headings", description: "Project heading management endpoints" },
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
})

console.log(JSON.stringify(spec, null, 2))

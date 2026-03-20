import { defineConfig } from "vite-plus"

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: {
    semi: false,
    printWidth: 120,
    sortPackageJson: false,
    ignorePatterns: [
      "**/dist",
      "**/build",
      "**/.output",
      "**/.vite",
      "**/.turbo",
      "**/node_modules",
      "**/routeTree.gen.ts",
      "**/styles.css",
      "**/components/ui",
      "**/.env",
      "**/.env.*",
      "!**/.env.example",
      "**/*.db",
      "**/*.db-*",
      "**/*.log",
      "packages/sdk/openapi.json",
      "packages/server/drizzle/**",
    ],
  },
})

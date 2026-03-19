import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [tailwindcss(), solid()],
  server: {
    host: "0.0.0.0",
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || "dev"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: "automatic",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

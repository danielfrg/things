import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["index.ts"],
    exe: {
      fileName: "things",
      outDir: "dist",
      targets: [
        { platform: "darwin", arch: "arm64", nodeVersion: "25.7.0" },
        { platform: "darwin", arch: "x64", nodeVersion: "25.7.0" },
        { platform: "linux", arch: "arm64", nodeVersion: "25.7.0" },
        { platform: "linux", arch: "x64", nodeVersion: "25.7.0" },
      ],
    },
  },
});

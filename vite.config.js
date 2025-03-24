import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./", // Relative paths for GitHub Pages
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"), // Explicit entry point
      },
    },
  },
  resolve: {
    alias: {
      "three/addons": "three/examples/jsm",
    },
  },
});

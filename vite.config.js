import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./", // Required for GitHub Pages
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
      // Fix Three.js examples paths
      "three/addons": resolve(__dirname, "node_modules/three/examples/jsm"),
      "three/examples": resolve(__dirname, "node_modules/three/examples/jsm"),
    },
  },
});

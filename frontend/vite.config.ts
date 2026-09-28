/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Keep only stable, genuinely shared dependencies in vendor chunks. Route-specific
// Carbon components should remain with their lazy route instead of forcing the
// complete Carbon bundle into the first page load.
const vendorGroups = [
  { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
  { name: "carbon-icons", test: /node_modules[\\/]@carbon[\\/]icons-react[\\/]/ },
  { name: "query", test: /node_modules[\\/](@tanstack|axios)[\\/]/ },
  { name: "thunderid", test: /node_modules[\\/]@thunderid[\\/]/ },
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/shared/testing/setup.ts"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        codeSplitting: { groups: vendorGroups },
      },
    },
  },
});

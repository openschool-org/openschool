/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

// Keep only stable, genuinely shared dependencies in vendor chunks. antd
// components stay with their lazy route so the first page load stays small.
const vendorGroups = [
  { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
  { name: "query", test: /node_modules[\\/](@tanstack|axios)[\\/]/ },
  { name: "thunderid", test: /node_modules[\\/]@thunderid[\\/]/ },
];

export default defineConfig({
  plugins: [react()],
  // package.json is the one place the app version is set.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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

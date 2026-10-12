/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Content Security Policy for the published site: the page may only load its own code and
 * Google's sign-in script, and only talk to Google's sign-in and Apps Script endpoints.
 * Build only, because the dev server needs inline scripts for hot reload.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "connect-src 'self' https://accounts.google.com/gsi/ https://oauth2.googleapis.com https://www.googleapis.com https://script.googleapis.com",
  "frame-src https://accounts.google.com/gsi/",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function securityHeaders(): Plugin {
  return {
    name: "security-meta-tags",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
        injectTo: "head-prepend",
      },
      {
        tag: "meta",
        attrs: { name: "referrer", content: "no-referrer" },
        injectTo: "head-prepend",
      },
    ],
  };
}

/**
 * Stops a build without the Google IDs, so a broken site is never published. Same names as
 * REQUIRED_ENV in src/lib/config.ts (that file reads import.meta.env, which isn't available here).
 */
function requireEnv(names: string[]): Plugin {
  let env: Record<string, string> = {};
  return {
    name: "require-env",
    apply: "build",
    configResolved: (config) => {
      env = config.env;
    },
    buildStart() {
      const missing = names.filter((name) => !env[name]?.trim());
      if (missing.length) {
        this.error(
          `Missing ${missing.join(", ")}. Set them in .env (see .env.example), or as repository variables for GitHub Actions.`,
        );
      }
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the site at https://<user>.github.io/my-jobs-tracker/
  base: "/my-jobs-tracker/",
  plugins: [
    react(),
    securityHeaders(),
    requireEnv(["VITE_GOOGLE_CLIENT_ID", "VITE_APPS_SCRIPT_ID"]),
    tailwindcss(),
  ],
  test: {
    environment: "node",
  },
});

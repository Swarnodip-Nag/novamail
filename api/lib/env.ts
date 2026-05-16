import dotenv from "dotenv";
import path from "path";

// Explicitly load .env from the project root (process.cwd())
// override: true ensures we always read the latest .env values,
// even if Vite has already loaded them into process.env
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

// Use getters so env vars are read fresh from process.env each time,
// avoiding stale values from Vite HMR / SSR module caching
export const env = {
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY ?? "";
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  },
  get sessionSecret() {
    return process.env.SESSION_SECRET ?? "nova-mail-secret-change-me";
  },
};

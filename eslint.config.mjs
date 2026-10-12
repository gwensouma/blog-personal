import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next 15 ships legacy (eslintrc) configs; FlatCompat adapts them to flat config.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  { ignores: [".next/**", "out/**", "node_modules/**", ".data/**", ".data-e2e/**", "test-results/**", "playwright-report/**", "blob-report/**", ".playwright-mcp/**", ".claude/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;

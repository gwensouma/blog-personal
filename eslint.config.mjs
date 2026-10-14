import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next 15 ships legacy (eslintrc) configs; FlatCompat adapts them to flat config.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// A Tailwind palette class (text-blue-700, bg-zinc-50/50) or an arbitrary hex value (bg-[#fff]) in a class string.
const PALETTE = String.raw`/(^|[\s:])(bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|shadow|divide|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|-\[#[0-9a-fA-F]{3,8}\]/`;

const eslintConfig = [
  { ignores: [".next/**", "out/**", "node_modules/**", ".data/**", ".data-e2e/**", "test-results/**", "playwright-report/**", "blob-report/**", ".playwright-mcp/**", ".claude/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Project conventions from CLAUDE.md, enforced here instead of in prose.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["./*", "../*"], message: "Import through the @/ alias, not a relative path." }] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${PALETTE}], TemplateElement[value.raw=${PALETTE}]`,
          message: "Use the semantic theme tokens from app/globals.css, not Tailwind palette classes or raw hex.",
        },
      ],
    },
  },
];

export default eslintConfig;

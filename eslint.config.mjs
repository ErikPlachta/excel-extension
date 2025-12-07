import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import angularEslintPlugin from "@angular-eslint/eslint-plugin";
import angularTemplatePlugin from "@angular-eslint/eslint-plugin-template";
import tsdoc from "eslint-plugin-tsdoc";

export default [
  {
    ignores: [
      "dist/**",
      ".angular/**",
      "node_modules/**",
      "_TEMPLATES/**",
      "_ARCHIVE/**",
      "public/**",
      "coverage/**",
      "src/index.html",
      "**/*.html",
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@angular-eslint": angularEslintPlugin,
      tsdoc,
    },
    rules: {
      // Enforce valid TSDoc on JSDoc-style comments for exported symbols.
      "tsdoc/syntax": "warn",
      // Prefer explicit types over implicit any on parameters/properties.
      "@typescript-eslint/no-explicit-any": [
        "warn",
        {
          ignoreRestArgs: true,
        },
      ],
      // For this codebase we allow top-level any for Office/Excel globals
      // and some bootstrap/error cases, documented with inline disables.
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    files: ["src/app/**/*.html"],
    ignores: [],
    languageOptions: {
      parser: angularTemplatePlugin.parser,
    },
    plugins: {
      "@angular-eslint/template": angularTemplatePlugin,
    },
    rules: {},
  },
];

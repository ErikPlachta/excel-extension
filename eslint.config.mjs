import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import angularEslintPlugin from "@angular-eslint/eslint-plugin";
import angularTemplatePlugin from "@angular-eslint/eslint-plugin-template";

export default [
  {
    ignores: [
      "dist/**",
      ".angular/**",
      "node_modules/**",
      "_TEMPLATES/**",
      "_ARCHIVE/**",
      "public/**",
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
    },
    rules: {},
  },
  {
    files: ["src/app/**/*.html"],
    languageOptions: {
      parser: angularTemplatePlugin.parser,
    },
    plugins: {
      "@angular-eslint/template": angularTemplatePlugin,
    },
    rules: {},
  },
];

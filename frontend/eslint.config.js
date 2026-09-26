import { readdirSync } from "node:fs";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const features = readdirSync(new URL("./src/features", import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const restrict = (patterns) => ["error", { patterns }];
const RULE = "@typescript-eslint/no-restricted-imports";

const BRITISH_SPELLING_WORDS = [
  ["Enrollment", "Enrolment"], ["enrollment", "enrolment"],
  ["Enrollments", "Enrolments"], ["enrollments", "enrolments"],
  ["Enroll", "Enrol"], ["enroll", "enrol"],
  ["Enrolls", "Enrols"], ["enrolls", "enrols"],
  ["Color", "Colour"], ["color", "colour"],
  ["Colors", "Colours"], ["colors", "colours"],
  ["Colored", "Coloured"], ["colored", "coloured"],
  ["Coloring", "Colouring"], ["coloring", "colouring"],
  ["Organization", "Organisation"], ["organization", "organisation"],
  ["Organizations", "Organisations"], ["organizations", "organisations"],
  ["Organize", "Organise"], ["organize", "organise"],
  ["Organized", "Organised"], ["organized", "organised"],
  ["Organizing", "Organising"], ["organizing", "organising"],
  ["Center", "Centre"], ["center", "centre"],
  ["Centers", "Centres"], ["centers", "centres"],
  ["Favorite", "Favourite"], ["favorite", "favourite"],
  ["Favorites", "Favourites"], ["favorites", "favourites"],
  ["Behavior", "Behaviour"], ["behavior", "behaviour"],
  ["Behaviors", "Behaviours"], ["behaviors", "behaviours"],
  ["Canceled", "Cancelled"], ["canceled", "cancelled"],
  ["Canceling", "Cancelling"], ["canceling", "cancelling"],
  ["Analyze", "Analyse"], ["analyze", "analyse"],
  ["Analyzed", "Analysed"], ["analyzed", "analysed"],
  ["Analyzing", "Analysing"], ["analyzing", "analysing"],
];

const BRITISH_SPELLING_LABEL_KEYS = new Set([
  "label", "labelText", "title", "subtitle", "placeholder", "description",
  "text", "aria-label", "ariaLabel", "fallback", "heading", "helperText", "invalidText",
]);

function reportBritishSpelling(context, node, value) {
  for (const [american, british] of BRITISH_SPELLING_WORDS) {
    if (new RegExp(`\\b${american}\\b`).test(value)) {
      context.report({ node, message: `Use British spelling "${british}" instead of "${american}" in user-facing text.` });
    }
  }
}

const britishSpellingRule = {
  meta: { type: "suggestion" },
  create(context) {
    return {
      JSXText(node) {
        reportBritishSpelling(context, node, node.value);
      },
      JSXAttribute(node) {
        if (!BRITISH_SPELLING_LABEL_KEYS.has(node.name.name)) return;
        const value = node.value;
        if (value?.type === "Literal" && typeof value.value === "string") {
          reportBritishSpelling(context, node, value.value);
        } else if (value?.type === "JSXExpressionContainer" && value.expression.type === "Literal" && typeof value.expression.value === "string") {
          reportBritishSpelling(context, node, value.expression.value);
        }
      },
      Property(node) {
        const keyName = node.key.type === "Identifier" ? node.key.name : node.key.type === "Literal" ? node.key.value : null;
        if (!keyName || !BRITISH_SPELLING_LABEL_KEYS.has(keyName)) return;
        if (node.value.type === "Literal" && typeof node.value.value === "string") {
          reportBritishSpelling(context, node, node.value.value);
        }
      },
    };
  },
};

// Proper nouns and role titles that stay capitalised inside sentence-case text.
const SENTENCE_CASE_ALLOW = new Set([
  "OpenSchool", "ThunderID", "A/L", "O/L", "NIC", "ID", "CSV", "PDF", "ECA", "IT", "Sri", "Lanka", "Sinhala", "Tamil", "English",
  "Principal", "Vice", "Section", "Head", "WhatsApp", "Grade", "Ctrl", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "January", "December", "September", "August",
]);

// Flags Title Case copy such as "Save Changes"; a string is only flagged when every word is capitalised.
function isTitleCase(value) {
  if (/^e\.g\./.test(value.trim())) return false;
  const words = value.trim().split(/\s+/).filter((w) => /^[A-Za-z]{2,}/.test(w));
  if (words.length < 2) return false;
  const rest = words.slice(1);
  return rest.every((w) => /^[A-Z][a-z]/.test(w)) && rest.some((w) => !SENTENCE_CASE_ALLOW.has(w.replace(/[^A-Za-z/]/g, "")));
}

const sentenceCaseRule = {
  meta: { type: "suggestion" },
  create(context) {
    const report = (node, value) => {
      if (isTitleCase(value)) context.report({ node, message: `Use sentence case in UI copy: "${value.trim()}".` });
    };
    return {
      JSXText(node) {
        const parent = node.parent?.openingElement?.name?.name;
        if (["Button", "Tab", "h1", "h2", "h3", "h4", "th", "label", "legend"].includes(parent)) report(node, node.value);
      },
      JSXAttribute(node) {
        if (!BRITISH_SPELLING_LABEL_KEYS.has(node.name.name)) return;
        const v = node.value;
        if (v?.type === "Literal" && typeof v.value === "string") report(node, v.value);
      },
    };
  },
};

// Layer contract from docs/FRONTEND_REFACTOR_PLAYBOOK.md section 2.2, enforced per folder.
const layerRules = [
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      [RULE]: restrict([
        { group: ["../*"], message: "Use the @/ alias instead of relative parent paths." },
        { group: ["@/features/*", "@/app/*", "@/layouts/*"], message: "shared/ must not depend on features, app or layouts." },
      ]),
    },
  },
  {
    files: ["src/features/*/api/**/*.ts"],
    rules: {
      [RULE]: restrict([
        { group: ["../*"], message: "Use the @/ alias instead of relative parent paths." },
        { group: ["react", "react-dom", "react-router", "@carbon/*", "@tanstack/*"], message: "api/ files are plain HTTP wrappers with no UI or hook imports." },
        { group: ["@/features/*/queries/*", "@/features/*/components/*", "@/features/*/pages/*", "@/shared/ui/*", "@/shared/hooks/*"], message: "api/ may import only other api types and shared/api." },
        { group: ["@/features/*/api/*"], allowTypeImports: true, message: "api/ files share types only, never call each other." },
      ]),
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    ignores: ["src/features/*/api/**"],
    rules: {
      [RULE]: restrict([
        { group: ["../*"], message: "Use the @/ alias instead of relative parent paths." },
        { group: ["axios", "@/shared/api/client"], message: "Only api/ files call the HTTP client." },
      ]),
    },
  },
  // A feature may use another feature's queries and components, never its pages or api.
  ...features.map((name) => ({
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    ignores: [`src/features/${name}/api/**`],
    rules: {
      [RULE]: restrict([
        { group: ["../*"], message: "Use the @/ alias instead of relative parent paths." },
        { group: ["axios", "@/shared/api/client"], message: "Only api/ files call the HTTP client." },
        {
          group: features.filter((f) => f !== name).flatMap((f) => [`@/features/${f}/pages/*`, `@/features/${f}/api/*`]),
          allowTypeImports: true,
          message: "Import another feature's queries or components, not its pages or api (types are fine).",
        },
      ]),
    },
  })),
  {
    files: ["src/app/**/*.{ts,tsx}", "src/layouts/**/*.{ts,tsx}"],
    rules: {
      [RULE]: restrict([
        { group: ["../*"], message: "Use the @/ alias instead of relative parent paths." },
        { group: ["@/features/*/api/*"], allowTypeImports: true, message: "app/ and layouts/ compose pages and queries, never api." },
        { group: ["axios"], message: "Only shared/api and feature api/ files use axios." },
      ]),
    },
  },
];

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { local: { rules: { "british-spelling": britishSpellingRule, "sentence-case": sentenceCaseRule } } },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      [RULE]: restrict([{ group: ["../*"], message: "Use the @/ alias instead of relative parent paths." }]),
      // Pages and components over this limit are split into the feature's components/ or hooks/.
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "no-restricted-properties": [
        "error",
        { property: "toLocaleDateString", message: "Use formatDate/formatMonth/formatLongDate/... from @/shared/lib/date instead." },
        { property: "toLocaleString", message: "Use formatDateTime from @/shared/lib/date instead." },
        { property: "toLocaleTimeString", message: "Add a helper to @/shared/lib/date instead of calling this directly." },
      ],
      "local/british-spelling": "error",
      "local/sentence-case": "error",
      // Em-dashes render inconsistently on Android fonts; use " - " or " · " (UX playbook C4).
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/\u2014/]", message: "No em-dashes in UI text. Use \" - \" or \" · \"." },
        { selector: "TemplateElement[value.raw=/\u2014/]", message: "No em-dashes in UI text. Use \" - \" or \" · \"." },
        { selector: "JSXText[value=/\u2014/]", message: "No em-dashes in UI text. Use \" - \" or \" · \"." },
        { selector: "ImportSpecifier[imported.name='DatePicker']", message: "Use DateField from @/shared/ui/DateField (calendar only, day-first display)." },
      ],
    },
  },
  {
    files: ["src/shared/ui/DateField.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["src/shared/lib/date.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
  ...layerRules,
]);

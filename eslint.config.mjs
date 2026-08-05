import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next. Globbed with a leading `**/` so
    // they also match build output inside nested checkouts (git worktrees under
    // `.claude/worktrees/`), which otherwise drown real findings in thousands
    // of errors from generated bundles.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    ".claude/worktrees/**",
  ]),
  {
    // Dashboard and admin screens are client components that load their data
    // with a fetch-on-mount effect. React's compiler lint flags the resulting
    // setState as a cascading render, but for a one-shot mount fetch that
    // extra pass is the intended cost, and there is no external store to
    // subscribe to instead.
    //
    // Downgraded to a warning rather than silenced so genuine cascades still
    // surface in review. The real fix is to move these reads into server
    // components (or a caching data layer) and pass data down as props —
    // tracked as follow-up work, not a drive-by refactor.
    files: ["src/app/dashboard/**/page.tsx", "src/app/admin/**/page.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;

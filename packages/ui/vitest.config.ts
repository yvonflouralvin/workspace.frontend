import { defineConfig } from "vitest/config";

// `node`, pas `jsdom` : les tests portent sur les RÈGLES de partage
// (`src/partage-grants.ts`), qui n'ont ni JSX ni DOM. Un environnement de
// navigateur serait une dépendance de plus pour rien.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});

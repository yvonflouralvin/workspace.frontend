/** Chaque chemin qu'un paquet partagé appelle doit avoir sa route BFF ici.
 *
 *  POURQUOI CE TEST EXISTE : les fonctions d'appel de `@repo/agent-chat` et
 *  de `@repo/inbox` vivent dans les paquets, les routes qui les servent
 *  vivent dans l'app. Rien ne reliait les deux — et la version 2026.11.24 est
 *  partie avec le CRUD des tâches récurrentes côté paquet et aucune route
 *  pour le servir. L'écran rendait un 404 que seul un essai à la main
 *  révélait. `tsc` ne peut pas voir ce trou : il n'y a pas de type qui relie
 *  une chaîne de caractères à un fichier de route.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const API = join(__dirname, "..", "api");

/** Un chemin tel que le client l'écrit, avec ses segments variables rendus
 *  sous la forme de dossier que Next attend. */
const ATTENDUS: string[] = [
  // @repo/agent-chat — la conversation
  "agent/conversations",
  "agent/conversations/[id]",
  "agent/conversations/[id]/messages",
  "agent/conversations/[id]/pieces",
  "agent/conversations/[id]/pieces/[documentId]",
  "agent/conversations/[id]/confirmations/[demandeId]",
  "agent/connexion",
  // @repo/agent-chat — les collaborateurs
  "agent/collaborateurs",
  "agent/collaborateurs/roles",
  "agent/collaborateurs/[id]",
  "agent/collaborateurs/[id]/missions",
  "agent/collaborateurs/[id]/taches",
  "agent/collaborateurs/[id]/taches/[tacheId]",
  "agent/collaborateurs/[id]/groupes",
  "agent/collaborateurs/missions/[missionId]",
  // @repo/inbox
  "inbox/fils",
  "inbox/fils/[id]",
  "inbox/fils/[id]/messages",
  "inbox/resume",
  "inbox/annuaire",
  "notifications/applications",
];

describe("les routes BFF que les paquets partagés appellent", () => {
  it.each(ATTENDUS)("%s est servie", (chemin) => {
    expect(existsSync(join(API, chemin, "route.ts")), chemin).toBe(true);
  });
});

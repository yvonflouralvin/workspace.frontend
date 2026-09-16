"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { AccountBalanceOutlined, PaidOutlined, ChevronRightOutlined } from "@mui/icons-material";

const SECTIONS = [
  {
    href: "/parametres/devise",
    icon: <PaidOutlined style={{ fontSize: 22 }} />,
    titre: "Devise",
    description: "Devise de tenue de la comptabilité, choisie parmi celles déclarées côté Facturation.",
  },
  {
    href: "/parametres/referentiels",
    icon: <AccountBalanceOutlined style={{ fontSize: 22 }} />,
    titre: "Référentiels",
    description: "Modèles de plan comptable — OHADA, PCG français, personnalisés.",
  },
];

export default function ParametresPage() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Paramètres</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Réglages globaux de l&rsquo;application Comptabilité.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-3 rounded-2xl border border-outline-soft bg-surface-container-lowest p-5 hover:border-primary transition-colors"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {s.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-body-lg font-semibold text-on-surface">{s.titre}</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">{s.description}</p>
              </div>
              <ChevronRightOutlined style={{ fontSize: 20 }} className="text-outline shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

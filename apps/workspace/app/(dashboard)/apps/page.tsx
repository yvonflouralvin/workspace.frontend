const APPS = [
  {
    id: "workspace",
    name: "Workspace",
    initial: "W",
    color: "#3525cd",
    description: "Tableau de bord, projets et gestion de l'équipe.",
    url: process.env.AUTH_API_AUTH_DOMAIN ?? "http://localhost:3005",
  },
  {
    id: "hr",
    name: "Ressources humaines",
    initial: "H",
    color: "#006c49",
    description: "Gestion des employés, congés et recrutement.",
    url: process.env.AUTH_API_HR_DOMAIN ?? "http://localhost:3003",
  },
];

export default function AppsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-on-surface">Applications</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Toutes les applications disponibles dans votre workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {APPS.map((app) => (
          <a
            key={app.id}
            href={app.url}
            className="flex flex-col gap-4 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary/30 hover:shadow-md transition-all"
          >
            <span
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: app.color }}
            >
              {app.initial}
            </span>
            <div>
              <p className="font-semibold text-on-surface">{app.name}</p>
              <p className="text-sm text-on-surface-variant mt-1">{app.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

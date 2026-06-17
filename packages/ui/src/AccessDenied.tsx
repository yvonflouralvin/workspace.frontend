import { LockOutlined } from "@mui/icons-material";

export function AccessDenied({ appName }: { appName: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-[28rem] text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-error-container/40 flex items-center justify-center">
          <LockOutlined className="text-error" style={{ fontSize: 24 }} />
        </div>
        <h1 className="text-headline-sm text-on-surface">Accès refusé</h1>
        <p className="text-sm text-on-surface-variant">
          Vous n&apos;avez pas accès à l&apos;application {appName}. Contactez
          l&apos;administrateur de votre workspace pour obtenir ce droit.
        </p>
      </div>
    </div>
  );
}

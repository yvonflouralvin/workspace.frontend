import { MobileAppBlock } from "@repo/ui/MobileAppBlock";
import { ParametresLayout } from "@/components/ParametresLayout";

export default function MobilePage() {
  return (
    <ParametresLayout>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-body-lg font-medium text-on-surface">Application mobile</h2>
          <p className="mt-0.5 max-w-[62ch] text-body-sm text-on-surface-variant">
            Facturation existe aussi sur Android : consulter les commandes, encaisser et
            suivre les factures depuis un téléphone.
          </p>
        </div>
        <MobileAppBlock appKey="ventes" appLabel="Facturation" />
      </div>
    </ParametresLayout>
  );
}

import type { Metadata } from "next";
import { EmailOutlined } from "@mui/icons-material";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Solution As A Service",
  description: "Une question sur nos modules ou sur une instance dédiée ? Parlons-en.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-gutter py-16">
      <div className="grid gap-xl lg:grid-cols-2">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-on-surface">
            Parlons de votre projet
          </h1>
          <p className="mt-sm max-w-2xl text-body-lg text-on-surface-variant">
            Une question sur un module, sur une instance dédiée à votre entreprise, ou juste
            envie de voir la plateforme fonctionner avec vos propres données : écrivez-nous.
          </p>

          <div className="mt-lg flex items-center gap-sm text-body-md text-on-surface-variant">
            <EmailOutlined className="!text-[20px] text-primary" />
            contact@solutionaas.com
          </div>
        </div>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

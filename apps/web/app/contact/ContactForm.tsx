"use client";

import { useState, type FormEvent } from "react";
import { Fleche } from "../../components/Bouton";

export function ContactForm() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function envoyer(e: FormEvent) {
    e.preventDefault();
    const sujet = encodeURIComponent(`Contact site — ${nom || "sans nom"}`);
    const corps = encodeURIComponent(`${message}\n\n— ${nom} (${email})`);
    window.location.href = `mailto:contact@solutionaas.com?subject=${sujet}&body=${corps}`;
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-md">
      <div>
        <label htmlFor="nom" className="text-label-md font-medium text-on-surface-variant">
          Nom
        </label>
        <input
          id="nom"
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="mt-xs w-full rounded-xl border border-outline-soft bg-surface-container-low px-md py-[0.7rem] text-body-md text-on-surface transition-colors outline-none placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-label-md font-medium text-on-surface-variant">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-xs w-full rounded-xl border border-outline-soft bg-surface-container-low px-md py-[0.7rem] text-body-md text-on-surface transition-colors outline-none placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <div>
        <label htmlFor="message" className="text-label-md font-medium text-on-surface-variant">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={6}
          placeholder="Ce que vous faites, combien vous êtes, et ce qui vous prend le plus de temps aujourd'hui."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-xs w-full rounded-xl border border-outline-soft bg-surface-container-low px-md py-[0.7rem] text-body-md text-on-surface transition-colors outline-none placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <button
        type="submit"
        className="group inline-flex items-center justify-center gap-sm rounded-xl bg-primary px-lg py-[0.8rem] text-body-md font-semibold text-on-primary shadow-[0_1px_0_0_rgb(255_255_255_/_0.25)_inset,0_10px_30px_-10px_rgb(53_37_205_/_0.7)] transition-all duration-200 hover:-translate-y-0.5"
      >
        Envoyer le message
        <Fleche />
      </button>
      <p className="text-body-sm text-on-surface-variant">
        Ouvre votre messagerie avec le message déjà prêt à envoyer.
      </p>
    </form>
  );
}

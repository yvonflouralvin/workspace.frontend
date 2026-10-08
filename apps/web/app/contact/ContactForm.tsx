"use client";

import { useState, type FormEvent } from "react";

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
          className="mt-xs w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary"
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
          className="mt-xs w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="message" className="text-label-md font-medium text-on-surface-variant">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-xs w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-primary px-md py-sm text-body-md font-medium text-on-primary shadow-button transition-opacity hover:opacity-90"
      >
        Envoyer le message
      </button>
      <p className="text-body-sm text-on-surface-variant">
        Ouvre votre messagerie avec le message déjà prêt à envoyer.
      </p>
    </form>
  );
}

// Petit "ding" synthétisé via la Web Audio API — évite d'embarquer un fichier audio.
// Deux notes courtes (A5 → D6) avec enveloppe pour un rendu agréable, sans clic.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

// À appeler sur le premier geste utilisateur (clic/touche) : crée + réveille l'AudioContext
// dans le contexte d'un geste, seul moment où les navigateurs l'autorisent. Sans ça, le
// tout premier `playNotificationSound` (déclenché par un signal WS, hors geste) reste muet.
export function unlockAudio(): void {
  const audio = getContext();
  if (audio && audio.state === "suspended") audio.resume().catch(() => {});
}

export function playNotificationSound(): void {
  const audio = getContext();
  if (!audio) return;
  try {
    // Les navigateurs suspendent l'AudioContext tant qu'il n'y a pas eu d'interaction ;
    // resume() est best-effort (le son ne jouera qu'après un premier geste utilisateur).
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const now = audio.currentTime;
    const notes: Array<[number, number]> = [
      [880, 0],
      [1174.66, 0.11],
    ];
    for (const [freq, offset] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    }
  } catch {
    /* silencieux : l'audio ne doit jamais casser l'app */
  }
}

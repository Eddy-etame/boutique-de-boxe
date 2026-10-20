'use client';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ETOILES, MODERATION_HREF, etoilesValides, lectureMoyenne, nombreDeNotes, nomEtoiles, virgule, type Moyenne } from '@/lib/notes';
import '@/app/notes.css';

/**
 * Les notes d'une fiche (20/10/2026) : le résumé près du prix (« ★ 4,6 · 12 notes », rendu au serveur)
 * et « Notez ce modèle », cinq étoiles, un clic, sans texte ni compte. Rien ne bouge dans la page :
 * le résumé n'apparaît jamais après coup, et le retour du widget occupe une place déjà réservée.
 */

/** Une étoile nette, aux angles vifs comme le reste de la boutique. */
function Etoile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M12 1.6l2.65 7.36 7.81.24-6.18 4.79 2.19 7.51L12 17.1l-6.47 4.4 2.19-7.51L1.54 9.2l7.81-.24z" />
    </svg>
  );
}

/* Les notes déjà données par cet appareil, gardées dans le navigateur pour les montrer au retour sur la
   fiche. Le serveur, lui, reconnaît l'appareil par son cookie : effacer ceci ne permet pas de noter deux fois. */
const CLE = 'bdb-notes';
let lu: { brut: string | null; notes: Record<string, number> } = { brut: null, notes: {} };
function mesNotes(): Record<string, number> {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut !== lu.brut) lu = { brut, notes: brut ? (JSON.parse(brut) as Record<string, number>) : {} };
  } catch {
    /* navigation privée ou valeur illisible : rien de mémorisé */
  }
  return lu.notes;
}
const ecouteurs = new Set<() => void>();
function abonner(rappel: () => void) {
  ecouteurs.add(rappel);
  const surStockage = (e: StorageEvent) => e.key === CLE && rappel();
  window.addEventListener('storage', surStockage);
  return () => {
    ecouteurs.delete(rappel);
    window.removeEventListener('storage', surStockage);
  };
}
function memoriser(produit: string, etoiles: number) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...mesNotes(), [produit]: etoiles }));
  } catch {
    /* rien de grave : seule l'étoile de retour manquera */
  }
  ecouteurs.forEach((f) => f());
}

/** Le résumé près du prix : seulement quand le modèle a au moins une note visible. */
export function NoteResume({ produit, note }: { produit: string; note: Moyenne | null }) {
  const [moyenne, setMoyenne] = useState(note);
  useEffect(() => {
    const suivre = (e: Event) => {
      const d = (e as CustomEvent<{ produit: string; moyenne: Moyenne | null }>).detail;
      if (d?.produit === produit && d.moyenne) setMoyenne(d.moyenne);
    };
    window.addEventListener('boutique:note', suivre);
    return () => window.removeEventListener('boutique:note', suivre);
  }, [produit]);
  // Sans note au rendu du serveur, rien : une ligne qui surgirait au-dessus du prix décalerait la page.
  if (!note || !moyenne) return null;
  return (
    <p className="note-resume">
      <a href="#notez" className="note-resume-moyenne" aria-label={`${lectureMoyenne(moyenne)}. Noter ce modèle`}>
        <Etoile className="note-resume-etoile" />
        <strong>{virgule(moyenne.valeur)}</strong>
        <span aria-hidden="true">·</span>
        <span>{nombreDeNotes(moyenne.total)}</span>
      </a>
      <a href={MODERATION_HREF} className="note-mention">
        Notes de visiteurs, sans vérification d’achat
      </a>
    </p>
  );
}

type Etat = 'repos' | 'choix' | 'envoi' | 'merci' | 'erreur';

/** « Notez ce modèle » : un groupe de cinq boutons radio, « 1 étoile » à « 5 étoiles ». */
export function NotezCeModele({ produit, note }: { produit: string; note: Moyenne | null }) {
  const nom = useId();
  const mienne = useSyncExternalStore(
    abonner,
    () => {
      const n = mesNotes()[produit];
      return etoilesValides(n) ? n : 0;
    },
    () => 0,
  );
  const [choix, setChoix] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [etat, setEtat] = useState<Etat>('repos');
  const [message, setMessage] = useState('');
  const [moyenne, setMoyenne] = useState(note);
  const [coup, setCoup] = useState(0);
  const clavier = useRef(false);
  const envoi = useRef<AbortController | null>(null);
  const piege = useRef<HTMLInputElement>(null);
  const cochee = choix || mienne;
  const pleines = survol || cochee;

  async function noter(etoiles: number) {
    envoi.current?.abort();
    const controle = new AbortController();
    envoi.current = controle;
    setChoix(etoiles);
    setEtat('envoi');
    // La région annoncée se vide d'abord : une deuxième note est annoncée comme la première.
    setMessage('');
    try {
      const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produit, etoiles, website: piege.current?.value || '' }),
        signal: controle.signal,
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; message?: string; moyenne?: Moyenne | null };
      if (!r.ok) throw new Error(d.error || 'La note n’a pas pu être enregistrée. Réessayez dans un instant.');
      memoriser(produit, etoiles);
      setMoyenne(d.moyenne ?? null);
      setEtat('merci');
      setCoup((c) => c + 1);
      setMessage(d.message || 'Merci, votre note est enregistrée.');
      window.dispatchEvent(new CustomEvent('boutique:note', { detail: { produit, moyenne: d.moyenne ?? null } }));
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setChoix(0);
      setEtat('erreur');
      setMessage(error instanceof TypeError ? 'Connexion interrompue : la note n’est pas partie. Réessayez.' : (error as Error).message);
    }
  }

  const aide =
    etat === 'choix' && choix
      ? `${nomEtoiles(choix)} : Entrée pour valider.`
      : mienne
        ? `Votre note : ${nomEtoiles(mienne)}. Un clic la change.`
        : 'Un clic suffit, sans compte ni texte.';

  return (
    <section className="note-widget" id="notez" aria-labelledby={nom + '-titre'} data-etat={etat}>
      <fieldset
        className="note-etoiles"
        aria-describedby={nom + '-aide'}
        aria-busy={etat === 'envoi' || undefined}
      >
        <legend id={nom + '-titre'} className="note-titre">
          Notez ce modèle
        </legend>
        <div className="note-rangee">
          {ETOILES.map((n) => (
            <label
              key={n}
              className="note-etoile"
              data-pleine={n <= pleines ? '' : undefined}
              data-apercu={survol && n <= survol ? '' : undefined}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setSurvol(n);
              }}
              onPointerLeave={() => setSurvol(0)}
            >
              <input
                type="radio"
                name={nom}
                value={n}
                checked={cochee === n}
                onChange={() => {
                  // Flèches : on choisit sans envoyer, Entrée valide. Clic, toucher, Espace : la note part.
                  if (clavier.current) {
                    clavier.current = false;
                    setChoix(n);
                    setEtat('choix');
                    return;
                  }
                  void noter(n);
                }}
                onKeyDown={(e) => {
                  if (/^Arrow|^Home$|^End$/.test(e.key)) clavier.current = true;
                  else if (e.key === 'Enter' || (e.key === ' ' && cochee === n)) {
                    e.preventDefault();
                    void noter(n);
                  }
                }}
                onKeyUp={() => {
                  clavier.current = false;
                }}
              />
              <span className="note-impact" key={etat === 'merci' && n <= cochee ? coup : 0} style={{ '--i': n } as React.CSSProperties}>
                <Etoile />
              </span>
              <span className="sr-only">{nomEtoiles(n)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="note-retour">
        <p id={nom + '-aide'} className="note-aide" aria-hidden={message ? true : undefined}>
          {aide}
          <span className="sr-only"> Au clavier : les flèches choisissent, Entrée valide.</span>
        </p>
        <p className="note-message" role="status" aria-live="polite">
          {message}
          {etat === 'merci' && moyenne ? <span className="note-nouvelle-moyenne">{`Moyenne ${virgule(moyenne.valeur)} sur 5 · ${nombreDeNotes(moyenne.total)}`}</span> : null}
        </p>
      </div>
      <p className="note-legal">
        <a href={MODERATION_HREF}>
          Notes laissées par des visiteurs, sans vérification d’achat · <span>comment elles sont modérées</span>
        </a>
      </p>
      {/* Champ piège : invisible pour un humain, rempli par un robot ; le serveur refuse alors la note. */}
      <label className="honeypot" aria-hidden="true">
        Laisser vide
        <input ref={piege} name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </section>
  );
}

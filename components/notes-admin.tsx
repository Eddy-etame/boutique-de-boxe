'use client';
import { useCallback, useEffect, useState } from 'react';
import { LIBELLE_MOTIF, MOTIFS_RETRAIT, nomEtoiles, virgule, type MotifRetrait, type Moyenne } from '@/lib/notes';
import type { NoteAtelier } from '@/lib/notes-sql';
import '@/app/notes.css';

/**
 * L'atelier, « Notes des produits » (20/10/2026) : chaque note avec son modèle, ses étoiles, sa date et
 * son statut. Retirer exige un motif choisi dans la liste (robot, doublon, abus, autre), conservé avec
 * la date et l'auteur ; une note retirée se rétablit d'un clic.
 */
type Donnees = {
  notes: NoteAtelier[];
  visibles: number;
  retirees: number;
  produits: Record<string, { nom: string; slug: string }>;
};
type Filtre = 'toutes' | 'visible' | 'retiree';

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function Etoiles({ n }: { n: number }) {
  return (
    <span className="notes-atelier-etoiles" aria-label={nomEtoiles(n) + ' sur 5'}>
      <span aria-hidden="true">{'★'.repeat(n)}</span>
      <span aria-hidden="true" className="notes-atelier-vides">
        {'★'.repeat(5 - n)}
      </span>
    </span>
  );
}

export function NotesAdmin() {
  const [donnees, setDonnees] = useState<Donnees>();
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [ouverte, setOuverte] = useState('');
  const [motif, setMotif] = useState<MotifRetrait | ''>('');
  const [precision, setPrecision] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [statut, setStatut] = useState('');

  const charger = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch('/api/notes/atelier', { cache: 'no-store', signal });
    const d = (await r.json()) as Donnees & { error?: string };
    if (!r.ok) throw new Error(d.error || 'Notes indisponibles.');
    return d;
  }, []);
  useEffect(() => {
    const c = new AbortController();
    charger(c.signal)
      .then(setDonnees)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setErreur(e.message);
      });
    return () => c.abort();
  }, [charger]);

  async function agir(corps: Record<string, string>, fait: string) {
    setOccupe(true);
    setStatut('');
    try {
      const r = await fetch('/api/notes/atelier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      const d = (await r.json().catch(() => ({}))) as { error?: string; moyenne?: Moyenne | null };
      if (!r.ok) throw new Error(d.error || 'Modification impossible.');
      setOuverte('');
      setMotif('');
      setPrecision('');
      setStatut(fait + (d.moyenne ? ` Nouvelle moyenne du modèle : ${virgule(d.moyenne.valeur)} sur 5 (${d.moyenne.total}).` : ' Le modèle n’a plus de note visible.'));
      setDonnees(await charger());
    } catch (e) {
      setStatut((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  if (erreur) return <p role="alert">{erreur}</p>;
  if (!donnees) return <p role="status">Chargement des notes…</p>;
  const liste = donnees.notes.filter((n) => filtre === 'toutes' || n.status === filtre);
  return (
    <div className="admin-inbox notes-atelier">
      <p className="atelier-suspects notes-atelier-rappel" role="note">
        <strong>
          Retirer une note parce qu’elle est mauvaise est une pratique commerciale trompeuse, et Google peut retirer les étoiles du
          site. Retirez seulement les notes frauduleuses.
        </strong>
      </p>
      <p>
        Les visiteurs notent chaque modèle de 1 à 5 étoiles, sans texte ni compte, une fois par appareil. La moyenne publiée sur la
        fiche compte les notes visibles. « Même connexion » signale plusieurs notes du même modèle venues de la même adresse réseau :
        un doublon possible, à vérifier avant tout retrait. Les 500 notes les plus récentes sont affichées.
      </p>
      <div className="notes-atelier-tete">
        <p className="notes-atelier-totaux">
          <strong>{donnees.visibles}</strong> visible{donnees.visibles > 1 ? 's' : ''} · <strong>{donnees.retirees}</strong> retirée
          {donnees.retirees > 1 ? 's' : ''}
        </p>
        <div className="segmented" role="group" aria-label="Afficher">
          {(
            [
              ['toutes', 'Toutes'],
              ['visible', 'Visibles'],
              ['retiree', 'Retirées'],
            ] as [Filtre, string][]
          ).map(([f, l]) => (
            <button key={f} type="button" aria-pressed={filtre === f} onClick={() => setFiltre(f)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {statut && (
        <p role="status" className="notes-atelier-statut">
          {statut}
        </p>
      )}
      {liste.length === 0 ? (
        <p className="empty-state">{donnees.notes.length ? 'Aucune note dans ce filtre.' : 'Aucune note pour l’instant.'}</p>
      ) : (
        <div className="atelier-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col">Étoiles</th>
                <th scope="col">Date</th>
                <th scope="col">Statut</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {liste.map((n) => {
                const p = donnees.produits[n.product_id];
                return (
                  <tr key={n.id} data-statut={n.status}>
                    <td>
                      {p ? (
                        <a href={'/produits/' + p.slug + '/#notez'} target="_blank" rel="noreferrer">
                          {p.nom} ↗
                        </a>
                      ) : (
                        <span className="atelier-muted">Modèle retiré du catalogue ({n.product_id})</span>
                      )}
                    </td>
                    <td>
                      <Etoiles n={n.stars} />
                    </td>
                    <td>
                      {date(n.updated_at)}
                      {n.updated_at !== n.created_at && <small className="notes-atelier-modifiee"> modifiée, donnée le {date(n.created_at)}</small>}
                    </td>
                    <td>
                      {n.status === 'visible' ? 'Visible' : 'Retirée'}
                      {n.meme_connexion > 1 && (
                        <em className="atelier-suspect" title="Notes de ce modèle venues de la même adresse réseau">
                          même connexion ×{n.meme_connexion}
                        </em>
                      )}
                      {n.status === 'retiree' && (
                        <small className="notes-atelier-motif">
                          {LIBELLE_MOTIF[n.removed_reason || 'autre']}
                          {n.removed_detail ? ` : ${n.removed_detail}` : ''} · le {date(n.removed_at)}
                          {n.removed_by ? `, par ${n.removed_by}` : ''}
                        </small>
                      )}
                    </td>
                    <td className="atelier-actions">
                      {n.status === 'retiree' ? (
                        <button className="text-button" type="button" disabled={occupe} onClick={() => void agir({ id: n.id, action: 'retablir' }, 'Note rétablie.')}>
                          Rétablir
                        </button>
                      ) : ouverte === n.id ? (
                        <form
                          className="notes-atelier-retrait"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!motif) return;
                            void agir({ id: n.id, action: 'retirer', motif, precision }, 'Note retirée.');
                          }}
                        >
                          <label>
                            Motif du retrait
                            <select required value={motif} onChange={(e) => setMotif(e.target.value as MotifRetrait | '')}>
                              <option value="">Choisir…</option>
                              {MOTIFS_RETRAIT.map((m) => (
                                <option key={m} value={m}>
                                  {LIBELLE_MOTIF[m]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Précision{motif === 'autre' ? '' : ' (facultative)'}
                            <input
                              value={precision}
                              onChange={(e) => setPrecision(e.target.value)}
                              maxLength={200}
                              required={motif === 'autre'}
                              minLength={motif === 'autre' ? 3 : undefined}
                            />
                          </label>
                          <div>
                            <button className="button button-dark" type="submit" disabled={occupe || !motif}>
                              Retirer la note
                            </button>
                            <button className="text-button" type="button" onClick={() => setOuverte('')}>
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            setOuverte(n.id);
                            setMotif('');
                            setPrecision('');
                          }}
                        >
                          Retirer…
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

/** Les mots-clés du brief, un par ligne, avec chaque contrôle en vert ou en rouge. */
type Row = { query: string; path: string; title: boolean; heading: boolean; description: boolean; visible: number; answer: boolean; footer: boolean; ok: boolean };
export function BriefBoard() {
  const [data, setData] = useState<{ rows: Row[]; covered: number; total: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('/api/seo/brief', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (alive) { if (d.error) setError(d.error); else setData(d); } })
      .catch(() => { if (alive) setError('Lecture impossible.'); });
    return () => { alive = false; };
  }, []);
  if (error) return <p className="commerce-error">{error}</p>;
  if (!data) return <p>Lecture des mots-clés…</p>;
  const mark = (ok: boolean) => <span className={ok ? 'brief-ok' : 'brief-ko'} aria-label={ok ? 'oui' : 'non'}>{ok ? '●' : '○'}</span>;
  return (
    <section className="audience-block brief-board">
      <h3>Mots-clés du brief : {data.covered} sur {data.total} entièrement portés</h3>
      <p className="commerce-caption">Pour chaque requête, sa page doit la porter telle quelle dans le titre, l’accroche ou le H1, la description, au moins deux fois dans le texte, dans la réponse citable des moteurs d’IA, et dans le pied de page de chaque page. La position réelle se lit dans Search Console une fois le domaine connecté.</p>
      <div className="clients-scroll">
        <table className="audience-table brief-table">
          <thead><tr><th>Requête</th><th>Page</th><th>Titre</th><th>Accroche</th><th>Description</th><th>Texte</th><th>Réponse IA</th><th>Pied</th></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.query} className={r.ok ? '' : 'is-missing'}>
                <td><strong>{r.query}</strong></td>
                <td><a href={r.path} target="_blank" rel="noreferrer">{r.path}</a></td>
                <td>{mark(r.title)}</td><td>{mark(r.heading)}</td><td>{mark(r.description)}</td><td>{mark(r.visible >= 2)} <small>{r.visible}×</small></td><td>{mark(r.answer)}</td><td>{mark(r.footer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

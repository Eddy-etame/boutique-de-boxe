'use client';
import { useEffect, useId, useState } from 'react';
import type { Product } from '@/lib/catalog';
import { money } from '@/lib/catalog';
import { recommendGloveWeight, USAGES, type GloveUsage } from '@/lib/glove-weight';
import { ProductCard } from './shop-interactions';

export type WeightFacts = { oz: number; count: number; median: number; min: number; path: string | null; picks: Product[] };

/**
 * Le calculateur de poids de gants : trois questions, une réponse en onces, les modèles à ce poids.
 * Rendu côté serveur avec les valeurs de l’URL (la page marche sans script et se partage), puis vivant.
 */
export function GloveWeightTool({ initial, facts }: { initial: { usage: GloveUsage | null; kg: number | null; age: number | null }; facts: WeightFacts[] }) {
  const id = useId();
  const [usage, setUsage] = useState<GloveUsage | null>(initial.usage);
  const [kg, setKg] = useState(initial.kg ? String(initial.kg) : '');
  const [age, setAge] = useState(initial.age ? String(initial.age) : '');
  const advice = usage ? recommendGloveWeight({ usage, kg: Number(kg) || null, age: Number(age) || null }) : null;
  const fact = advice ? facts.find((f) => f.oz === advice.ounces) : null;

  // L’adresse suit les réponses : le résultat se partage et se retrouve.
  useEffect(() => {
    const q = new URLSearchParams();
    if (usage) q.set('usage', usage);
    if (kg) q.set('poids', kg);
    if (age) q.set('age', age);
    const next = window.location.pathname + (q.size ? '?' + q.toString() : '');
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, '', next);
  }, [usage, kg, age]);

  return (
    <div className="glove-tool">
      <form className="glove-form" method="get" action="/outils/poids-de-gants/" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>
            <span>01</span> Pour quelle séance ?
          </legend>
          <div className="glove-usages">
            {USAGES.map((u) => (
              <label key={u.key} className={usage === u.key ? 'is-selected' : ''}>
                <input type="radio" name="usage" value={u.key} checked={usage === u.key} onChange={() => setUsage(u.key)} />
                <strong>{u.label}</strong>
                <span>{u.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="glove-numbers">
          <div>
            <label htmlFor={id + '-kg'}>
              <span>02</span> Votre poids <em>(kg, facultatif)</em>
            </label>
            <input id={id + '-kg'} name="poids" type="number" inputMode="numeric" min={15} max={200} step={1} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="70" />
          </div>
          <div>
            <label htmlFor={id + '-age'}>
              <span>03</span> Votre âge <em>(facultatif, décisif avant 16 ans)</em>
            </label>
            <input id={id + '-age'} name="age" type="number" inputMode="numeric" min={4} max={99} step={1} value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" />
          </div>
        </div>
        <noscript>
          <button className="button button-dark" type="submit">
            Voir le poids conseillé
          </button>
        </noscript>
      </form>

      <div className="glove-answer" aria-live="polite">
        {advice ? (
          <>
            <span className="eyebrow">LE POIDS CONSEILLÉ / POUR {advice.who.toUpperCase()}</span>
            <p className="glove-ounces">
              <strong>{advice.ounces}</strong>
              <span>
                oz
                {advice.range[0] !== advice.range[1] && (
                  <em>
                    {' '}
                    ({advice.range[0]} à {advice.range[1]} oz selon la salle)
                  </em>
                )}
              </span>
            </p>
            <p className="glove-why">{advice.why}</p>
            <p className="glove-caution">{advice.caution}</p>
            {fact && fact.count > 0 && (
              <p className="glove-facts">
                {fact.count} modèles proposés en {fact.oz} oz au catalogue, de {money(fact.min)}, prix médian {money(fact.median)}.
                {fact.path && (
                  <>
                    {' '}
                    <a href={fact.path}>Voir les gants de boxe {fact.oz} oz ↗</a>
                  </>
                )}
              </p>
            )}
          </>
        ) : (
          <>
            <span className="eyebrow">LE POIDS CONSEILLÉ</span>
            <p className="glove-ounces glove-ounces-empty">
              <strong>?</strong>
              <span>oz</span>
            </p>
            <p className="glove-why">Choisissez la séance : la réponse s’affiche ici, avec les modèles à ce poids.</p>
          </>
        )}
      </div>

      {fact && fact.picks.length > 0 && (
        <section className="glove-picks" aria-label={'Des modèles en ' + fact.oz + ' oz'}>
          <h2>
            Quatre paires en {fact.oz} oz, <br />
            une par marque.
          </h2>
          <div className="product-grid">
            {fact.picks.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

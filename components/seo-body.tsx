import type { SeoFaq, SeoSection } from '@/lib/seo-copy';

/** Texte de fond d’une page de catalogue : sections lisibles, puis les questions fréquentes. */
export function SeoBody({ sections, faq, heading = 'Questions fréquentes' }: { sections: SeoSection[]; faq?: SeoFaq[]; heading?: string }) {
  return (
    <>
      {sections.length > 0 && (
        <section className="seo-body" data-reveal="">
          {sections.map((s) => (
            <div key={s.h2}>
              <h2>{s.h2}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}
        </section>
      )}
      {faq && faq.length > 0 && (
        <section className="seo-faq" data-reveal="">
          <h2>{heading}</h2>
          {faq.map((f) => (
            <details key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}
    </>
  );
}

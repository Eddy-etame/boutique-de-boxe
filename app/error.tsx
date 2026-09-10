'use client';
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main id="contenu" className="page-wrap"><section className="not-found"><span className="eyebrow">UNE PAUSE TECHNIQUE</span><h1>Le catalogue revient<br/>dans un instant.</h1><p>Les prix et les références ne peuvent pas être vérifiés pour le moment. Votre panier enregistré est conservé.</p><button className="button button-dark" onClick={reset}>Réessayer</button><a className="inline-link" href="mailto:boxingcenter31@gmail.com">Contacter Boxing Center ↗</a></section></main>;
}

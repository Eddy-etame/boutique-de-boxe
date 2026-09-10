import type { Edition } from '@/lib/edition';

/**
 * Interrupteur d’édition, en haut de chaque page, dans les deux éditions.
 * Liens natifs : le passage déclenche une transition de vue entre documents ;
 * la route lit le Referer pour revenir sur la même page.
 */
export function EditionToggle({ edition }: { edition: Edition }) {
  return (
    <div className="edition-bar" data-edition={edition}>
      <span className="edition-bar-label">Deux versions du site</span>
      <nav className="edition-switch" aria-label="Version du site">
        <a
          href="/api/edition?to=actuelle"
          aria-current={edition === 'actuelle' ? 'true' : undefined}
          data-edition-link="actuelle"
        >
          Édition actuelle
        </a>
        <a
          href="/api/edition?to=nouvelle"
          aria-current={edition === 'nouvelle' ? 'true' : undefined}
          data-edition-link="nouvelle"
        >
          Nouvelle édition
        </a>
        <span className="edition-thumb" aria-hidden="true" />
      </nav>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var d=document;d.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('[data-edition-link]');if(!a)return;var n=encodeURIComponent(location.pathname+location.search);a.setAttribute('href',a.getAttribute('href').split('&next=')[0]+'&next='+n);try{sessionStorage.setItem('edition-switch',a.getAttribute('data-edition-link'))}catch(_){}});window.addEventListener('pagereveal',function(e){var t;try{t=sessionStorage.getItem('edition-switch');sessionStorage.removeItem('edition-switch')}catch(_){}if(!t||!e.viewTransition)return;try{e.viewTransition.types.add('edition')}catch(_){}d.documentElement.classList.add('edition-switch');e.viewTransition.finished.finally(function(){d.documentElement.classList.remove('edition-switch')})});})();`,
        }}
      />
    </div>
  );
}

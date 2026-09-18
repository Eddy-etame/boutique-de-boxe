'use client';
import { useEffect, useRef, useState } from 'react';
import { BOXTAL_MAP_SCRIPT, RELAY_NETWORKS, relayLabel, type RelayPoint } from '@/lib/boxtal';

/**
 * Le choix du point relais, au panier : la carte Boxtal (Mondial Relay, Chronopost, Relais Colis,
 * UPS, Colissimo) cherchée sur le code postal saisi à l’étape 1. Le point retenu part avec la commande.
 * Tant que les clés Boxtal ne sont pas posées, le bloc le dit et l’essai de commande continue sans relais.
 */
type BoxtalMap = { searchParcelPoints: (q: { country: string; zipCode: string; city?: string; street?: string }, onSelect: (pp: unknown) => void) => void };
type BoxtalCtor = new (o: {
  domToLoadMap: string;
  accessToken: string;
  config: { locale: string; parcelPointNetworks: { code: string; markerTemplate?: { color: string } }[]; options: { primaryColor: string; autoSelectNearestParcelPoint: boolean } };
  onMapLoaded?: () => void;
}) => BoxtalMap;
declare global {
  interface Window {
    BoxtalParcelPointMap?: BoxtalCtor;
  }
}

type TokenReply = { configured: boolean; accessToken?: string; expiresIn?: number };
type State = 'loading' | 'unconfigured' | 'ready' | 'failed';

const str = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = k.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), o);
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

/** Le point rendu par la carte, ramené à ce que la commande garde. Null si la lecture échoue. */
function normalise(pp: unknown): RelayPoint | null {
  if (!pp || typeof pp !== 'object') return null;
  const o = pp as Record<string, unknown>;
  const r = {
    code: str(o, 'code', 'id', 'parcelPointCode'),
    network: str(o, 'network', 'networkCode', 'parcelPointNetwork', 'network.code'),
    name: str(o, 'name', 'label'),
    address: str(o, 'location.street', 'address.street', 'street', 'address'),
    postcode: str(o, 'location.zipCode', 'address.zipCode', 'zipCode', 'postalCode'),
    city: str(o, 'location.city', 'address.city', 'city'),
  };
  return r.code && r.network && r.name && r.address && /^\d{5}$/.test(r.postcode) && r.city ? r : null;
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  if (window.BoxtalParcelPointMap) return Promise.resolve();
  if (!scriptPromise)
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = BOXTAL_MAP_SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('script'));
      };
      document.head.appendChild(s);
    });
  return scriptPromise;
}

export function RelayPicker({ postcode, city, value, onChange, disabled }: { postcode: string; city: string; value: RelayPoint | null; onChange: (r: RelayPoint | null) => void; disabled?: boolean }) {
  const [state, setState] = useState<State>('loading');
  const [unreadable, setUnreadable] = useState(false);
  const map = useRef<BoxtalMap | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const zip = /^\d{5}$/.test(postcode.trim()) ? postcode.trim() : '';

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = (await (await fetch('/api/commerce/relay-token', { cache: 'no-store' })).json()) as TokenReply;
        if (!alive) return;
        if (!r.configured || !r.accessToken) return setState('unconfigured');
        await loadScript();
        if (!alive || !window.BoxtalParcelPointMap || !holder.current) return setState('failed');
        holder.current.id = holder.current.id || 'relais-carte';
        map.current = new window.BoxtalParcelPointMap({
          domToLoadMap: '#' + holder.current.id,
          accessToken: r.accessToken,
          config: {
            locale: 'fr',
            parcelPointNetworks: RELAY_NETWORKS.map((n) => ({ code: n.code, markerTemplate: { color: n.color } })),
            options: { primaryColor: '#455c29', autoSelectNearestParcelPoint: true },
          },
          onMapLoaded: () => {
            if (alive) setState('ready');
          },
        });
      } catch {
        if (alive) setState('failed');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // La recherche suit le code postal de l’étape 1, sans re-saisie.
  useEffect(() => {
    if (state !== 'ready' || !map.current || !zip) return;
    const handle = setTimeout(() => {
      map.current?.searchParcelPoints({ country: 'FR', zipCode: zip, city: city.trim() || undefined }, (pp) => {
        const r = normalise(pp);
        setUnreadable(!r);
        onChangeRef.current(r);
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [state, zip, city]);

  return (
    <div className={'relay-picker is-' + state} aria-live="polite">
      {state === 'unconfigured' && (
        <p className="relay-note">
          La carte des points relais ({RELAY_NETWORKS.map((n) => n.name).join(', ')}) s’ouvre avec les ventes. Pour cet essai, la livraison en relais se
          calcule sans choisir le point.
        </p>
      )}
      {state === 'failed' && <p className="relay-note">La carte des relais n’a pas pu se charger. L’essai de commande continue sans choisir le point.</p>}
      {state === 'loading' && <p className="relay-note">Chargement de la carte des relais…</p>}
      {state === 'ready' && !zip && (
        <p className="relay-note">Indiquez votre code postal à l’étape 1 : la carte cherche les relais autour.</p>
      )}
      <div ref={holder} className="relay-map" hidden={state === 'unconfigured' || state === 'failed'} aria-label="Carte des points relais" />
      {value ? (
        <p className="relay-chosen">
          <strong>Relais choisi</strong> {relayLabel(value)}
          {!disabled && (
            <button type="button" className="text-button" onClick={() => onChange(null)}>
              Changer
            </button>
          )}
        </p>
      ) : (
        state === 'ready' && zip && <p className="relay-note">{unreadable ? 'Le point sélectionné n’a pas pu être lu. Choisissez-en un autre sur la carte.' : 'Choisissez un point sur la carte.'}</p>
      )}
    </div>
  );
}

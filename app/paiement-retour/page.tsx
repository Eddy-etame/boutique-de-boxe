import type { Metadata } from 'next';
import { PayplugReturn } from '@/components/payplug-settings';
import { slugMetadata } from '../[...slug]/metadata';

/** Retour de paiement : lu à chaque visite (?id=, ?cancel=), hors du catalogue statique. */
type Props = { searchParams: Promise<Record<string, string | undefined>> };
export function generateMetadata(): Promise<Metadata> {
  return slugMetadata(['paiement-retour']);
}
export default async function PaiementRetourPage({ searchParams }: Props) {
  const q = await searchParams;
  return (
    <main id="contenu" className="page-wrap">
      <PayplugReturn id={q.id || ''} cancelled={q.cancel === '1'} />
    </main>
  );
}

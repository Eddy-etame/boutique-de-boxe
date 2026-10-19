import type { Metadata } from 'next';
import { ReceiptPage } from '@/components/commerce-ui';
import { slugMetadata } from '../[...slug]/metadata';

/** Reçu : lu à chaque visite (?id=), hors du catalogue statique. */
type Props = { searchParams: Promise<Record<string, string | undefined>> };
export function generateMetadata(): Promise<Metadata> {
  return slugMetadata(['recu']);
}
export default async function RecuPage({ searchParams }: Props) {
  return (
    <main id="contenu" className="page-wrap">
      <ReceiptPage id={(await searchParams).id || ''} />
    </main>
  );
}

import type { Metadata } from 'next';
import { Unsubscribe } from '@/components/contact-form';
import { slugMetadata } from '../[...slug]/metadata';

/** Désinscription : lue à chaque visite (?token=, ?tout=), hors du catalogue statique. */
type Props = { searchParams: Promise<Record<string, string | undefined>> };
export function generateMetadata(): Promise<Metadata> {
  return slugMetadata(['desinscription']);
}
export default async function DesinscriptionPage({ searchParams }: Props) {
  const q = await searchParams;
  return (
    <main id="contenu" className="page-wrap">
      <Unsubscribe token={q.token || ''} all={q.tout === '1'} />
    </main>
  );
}

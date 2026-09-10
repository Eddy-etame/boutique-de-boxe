import type { Metadata } from 'next';
import Home from '@/components/home';
import { readCatalog } from '@/lib/database';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: { canonical: '/' } };
export default async function Page() {
  return <Home items={await readCatalog()} />;
}

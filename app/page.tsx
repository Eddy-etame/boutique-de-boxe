import type { Metadata } from 'next';
import Home from '@/components/home';
import { readCatalog } from '@/lib/database';
import { getEdition } from '@/lib/edition';
import { NextHome } from '@/components/next/home/home';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: { canonical: '/' } };
export default async function Page() {
  const items = await readCatalog();
  if ((await getEdition()) === 'nouvelle') return <NextHome items={items} />;
  return <Home items={items} />;
}

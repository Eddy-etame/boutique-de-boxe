import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};

export default function FormerAdminPage() {
  permanentRedirect('/admin/');
}

import { cookies } from 'next/headers';

/** Deux éditions du site cohabitent : l’édition actuelle (intacte) et la nouvelle. */
export type Edition = 'actuelle' | 'nouvelle';

export const EDITION_COOKIE = 'edition';

export function parseEdition(value: string | null | undefined): Edition {
  return value === 'nouvelle' ? 'nouvelle' : 'actuelle';
}

export async function getEdition(): Promise<Edition> {
  try {
    return parseEdition((await cookies()).get(EDITION_COOKIE)?.value);
  } catch {
    return 'actuelle';
  }
}

export function otherEdition(edition: Edition): Edition {
  return edition === 'nouvelle' ? 'actuelle' : 'nouvelle';
}

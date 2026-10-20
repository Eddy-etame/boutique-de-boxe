'use client';
import dynamic from 'next/dynamic';

/**
 * Le panier, chargé à part (20/10/2026). Importé tel quel par la page du catch-all, son code
 * (components/commerce-ui : panier, reçu, commandes ; ~76 Ko, 23 Ko compressé) partait avec toutes
 * les pages qu’elle sert — fiches, catégories, villes, guides. Chargé ici par next/dynamic, côté
 * client (côté serveur, Next le remettait dans le paquet de la page), il ne part plus qu’avec /panier/,
 * qui reste rendu au serveur.
 */
export const CartPage = dynamic(() => import('@/components/commerce-ui').then((m) => m.CartPage));

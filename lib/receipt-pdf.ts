import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { money, shop } from './catalog';
import type { CartLine, Order } from './commerce';
import { parseRelay, relayLabel } from './boxtal';

/**
 * Reçu de simulation en PDF, fidèle au reçu HTML téléchargeable : même masthead,
 * même bandeau jaune, même titre, même tableau, même total, même mention légale.
 * Rendu vectoriel (texte net, sélectionnable), sans moteur de navigateur — donc
 * léger et rapide sur Vercel, contrairement à un rendu Chromium.
 */

// Teintes du reçu HTML.
const INK = rgb(0x1c / 255, 0x21 / 255, 0x1e / 255);
const MUTED = rgb(0x59 / 255, 0x60 / 255, 0x59 / 255);
const TAPE = rgb(0xe9 / 255, 0xef / 255, 0x5b / 255);
const BORDER = rgb(0xdd / 255, 0xdd / 255, 0xdd / 255);

// Helvetica (WinAnsi) est l'équivalent d'Arial du reçu HTML, mais n'encode pas
// l'espace fine insécable de money() (U+202F) ni quelques caractères hors Latin-1.
// On ramène chaque texte à un jeu sûr avant de le dessiner.
const WINANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);
const FALLBACK: Record<string, string> = {
  ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
  '‘': "'", '’': "'", '“': '"', '”': '"',
};
function safe(input: string): string {
  let out = '';
  for (const ch of String(input ?? '').normalize('NFC')) {
    if (FALLBACK[ch] !== undefined) { out += FALLBACK[ch]; continue; }
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0xff) out += ch;
    else if (WINANSI_EXTRA.has(code)) out += ch;
    else out += '-';
  }
  return out;
}

type Fonts = { regular: PDFFont; bold: PDFFont };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export async function receiptPdf(order: Order): Promise<Uint8Array> {
  const lines = JSON.parse(order.lines) as CartLine[];
  const doc = await PDFDocument.create();
  doc.setTitle(`Recu de simulation ${order.id.slice(0, 8)}`);
  doc.setAuthor(shop.entity);
  doc.setSubject('Recu de commande d’essai — simulation, aucun debit');
  doc.setProducer('Boutique de Boxe');
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const W = 595.28; // A4 portrait
  const H = 841.89;
  const M = 52; // marge
  const right = W - M;
  const colW = right - M;

  let page = doc.addPage([W, H]);
  let y = H - M;

  const ensure = (need: number) => {
    if (y - need < M) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };
  const text = (s: string, opts: { x?: number; size?: number; font?: PDFFont; color?: typeof INK } = {}) => {
    page.drawText(safe(s), { x: opts.x ?? M, y, size: opts.size ?? 11, font: opts.font ?? fonts.regular, color: opts.color ?? INK });
  };
  const textRight = (s: string, opts: { size?: number; font?: PDFFont; color?: typeof INK } = {}) => {
    const size = opts.size ?? 11;
    const font = opts.font ?? fonts.regular;
    const str = safe(s);
    page.drawText(str, { x: right - font.widthOfTextAtSize(str, size), y, size, font, color: opts.color ?? INK });
  };

  // Masthead : le mot-marque, sur deux lignes comme sur le reçu HTML.
  ensure(46);
  text('BOUTIQUE', { size: 20, font: fonts.bold });
  y -= 22;
  text('DE BOXE.', { size: 20, font: fonts.bold });
  y -= 30;

  // Bandeau jaune : la mention de simulation, en gras.
  const tagText = 'SIMULATION - AUCUN DEBIT - AUCUNE EXPEDITION';
  ensure(30);
  page.drawRectangle({ x: M, y: y - 8, width: colW, height: 26, color: TAPE });
  page.drawText(tagText, { x: M + 10, y: y, size: 10.5, font: fonts.bold, color: INK });
  y -= 44;

  // Titre.
  ensure(66);
  text('Votre séance', { size: 30, font: fonts.bold });
  y -= 32;
  text('prend forme.', { size: 30, font: fonts.bold });
  y -= 34;

  // Salutation.
  ensure(18);
  for (const l of wrap(`Bonjour ${order.name}, voici le récapitulatif de votre commande d’essai.`, fonts.regular, 11, colW)) {
    ensure(16); text(l); y -= 16;
  }
  y -= 4;

  // Référence + date.
  ensure(30);
  text(`Référence ${order.id}`, { size: 9.5, color: MUTED });
  y -= 13;
  text(`${new Date(order.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} · EUR`, { size: 9.5, color: MUTED });
  y -= 26;

  // Tableau : en-tête.
  ensure(24);
  text('Équipement', { size: 11, font: fonts.bold });
  textRight('Montant simulé', { size: 11, font: fonts.bold });
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1, color: INK });
  y -= 18;

  const amountW = 90;
  const nameW = colW - amountW - 12;
  const drawRow = (name: string, sub: string | null, amount: string, boldName = true) => {
    const nameLines = wrap(name, boldName ? fonts.bold : fonts.regular, 11, nameW);
    const subLines = sub ? wrap(sub, fonts.regular, 9.5, nameW) : [];
    const rowH = nameLines.length * 14 + subLines.length * 12 + 12;
    ensure(rowH);
    const startY = y;
    for (const l of nameLines) { text(l, { size: 11, font: boldName ? fonts.bold : fonts.regular }); y -= 14; }
    for (const l of subLines) { text(l, { size: 9.5, color: MUTED }); y -= 12; }
    // Montant aligné en haut de la ligne.
    const savedY = y; y = startY;
    textRight(amount, { size: 11 });
    y = savedY;
    y -= 10;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.75, color: BORDER });
    y -= 4;
  };

  for (const l of lines) {
    drawRow(l.name, `${l.variant || 'Sans déclinaison'} · ${l.quantity} × ${money(l.price)}`, money(l.price * l.quantity));
  }
  const relay = parseRelay(order.relay_point);
  drawRow(`Livraison ${order.delivery === 'home' ? 'à domicile' : relay ? 'en point relais : ' + relayLabel(relay) : 'en point relais'} (simulation)`, null, money(order.shipping), false);

  // Total, aligné à droite.
  y -= 12;
  ensure(28);
  textRight(`Total simulé ${money(order.total)}`, { size: 18, font: fonts.bold });
  y -= 34;

  // Mentions.
  for (const l of wrap('Le paiement d’essai est approuvé. Aucun moyen de paiement réel n’a été demandé. Ce document n’est ni une facture ni une preuve d’achat.', fonts.regular, 11, colW)) {
    ensure(16); text(l); y -= 16;
  }
  y -= 6;
  for (const l of wrap('Tarifs indicatifs, y compris pour le matériel lourd ; transporteur, stock et conditions réelles restent à confirmer à l’ouverture.', fonts.regular, 9.5, colW)) {
    ensure(14); text(l, { size: 9.5, color: MUTED }); y -= 14;
  }
  y -= 10;

  // Filet + pied légal.
  ensure(50);
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1, color: BORDER });
  y -= 18;
  text(`${shop.entity} · SIREN ${shop.siren}`, { size: 9.5, color: MUTED });
  y -= 13;
  text(shop.address, { size: 9.5, color: MUTED });
  y -= 13;
  text(shop.email, { size: 9.5, color: MUTED });

  return doc.save();
}

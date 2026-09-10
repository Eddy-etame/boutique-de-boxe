// Schéma des textes de la nouvelle édition. Chaque groupe est rempli dans un
// fichier séparé de ce dossier ; les composants n’écrivent jamais de texte en dur.

export type Action = { label: string; hint?: string };

export type GlobalCopy = {
  tagline: string;
  edition: { current: string; next: string; switchTo: (name: string) => string };
  nav: { catalogue: string; guides: string; bag: string; contact: string; search: string; menu: string; close: string };
  footer: { about: string; legalLinks: string; contact: string; sales: string };
  status: { soon: string; pricePlanned: string; verifyWithGym: string; inBag: string };
  units: { oz: string; cm: string; kg: string };
  errors: { generic: string; network: string };
  a11y: { skip: string; mainMenu: string; live: string };
};

export type HomeCopy = {
  heroA: {
    kicker: string;
    title: string;
    sentence: string;
    marks: { closure: string; palm: string; weight: string };
    notes: { closure: string; palm: string; weight: string };
    noMacro: string;
    primary: Action;
    secondary: Action;
  };
  heroB: {
    kicker: string;
    title: string;
    sentence: string;
    choices: { start: string; train: string; child: string };
    reasonPrefix: string;
    totalLabel: string;
    lentByGym: string;
    primary: Action;
  };
  families: { title: string; countSuffix: string; open: string };
  notebook: { title: string; sentence: string; action: Action };
  sales: { title: string; sentence: string; alert: Action; consent: string };
};

export type CategoryCopy = {
  rail: {
    title: string;
    questions: {
      use: { label: string; options: { value: string; label: string }[] };
      level: { label: string; options: { value: string; label: string }[] };
      budget: { label: string; options: { value: string; label: string }[] };
    };
    sentence: (parts: { use?: string; level?: string; budget?: string; count: number }) => string;
    reset: string;
    more?: (remaining: number) => string;
  };
  filters: { search: string; brand: string; size: string; sort: string; sortOptions: { value: string; label: string }[] };
  families: Record<string, { title: string; intro: string; question: string }>;
  empty: string;
};

export type ProductCopy = {
  sizes: string;
  colours: string;
  chooseSize: string;
  addToBag: string;
  added: string;
  notify: Action;
  problemPrefix: string;
  specs: string;
  care: string;
  careUnknown: string;
  compare: string;
  verifyBox: string;
  photosMissing: string;
  delivery: string;
  breadcrumbHome: string;
};

export type CommerceCopy = {
  bag: { title: string; empty: string; lentHint: string; remove: string; quantity: string; subtotal: string; shipping: string; total: string; checkout: Action; keepShopping: string; changed: string };
  checkout: { title: string; name: string; email: string; delivery: { relay: string; home: string }; consent: string; outcome: { approved: string; declined: string }; submit: Action; noPayment: string };
  receipt: { title: string; timeline: { placed: string; paid: string; declined: string; email: string }; print: string; download: string; privateNote: string };
  alerts: { title: string; email: string; consent: string; submit: string; done: string; duplicate: string };
  contact: { title: string; name: string; email: string; message: string; submit: string; done: string; error: string };
  auth: { title: string; email: string; submit: string; sent: string; signout: string };
};

export type EditorialCopy = {
  guides: { title: string; sentence: string; readTime: (minutes: number) => string; summaryTitle: string };
  guideIntros: Record<string, { summary: string; forWhom: string }>;
  services: Record<string, { title: string; intro: string }>;
};

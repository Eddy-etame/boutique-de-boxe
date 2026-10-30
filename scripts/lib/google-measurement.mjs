// Offline evidence processing only. No network, credentials, database or production writes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

export const PROPERTY = 'sc-domain:boutique-de-boxe.com';
export const ORIGIN = 'https://www.boutique-de-boxe.com';
export const SCHEMA_VERSION = 1;
const foldHeader = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const queryKey = (value) => value.normalize('NFC').trim().toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ');
const countryKey = (value) => /^(?:fr|fra|france)$/i.test(value) ? 'FRA' : value.trim().toUpperCase();
const deviceKey = (value) => ({ mobile: 'mobile', desktop: 'desktop', ordinateur: 'desktop', tablet: 'tablet', tablette: 'tablet' })[foldHeader(value)];
const headerNames = {
  query: ['query', 'queries', 'topqueries', 'requete', 'requetes', 'requeteslesplusfrequentes'],
  page: ['page', 'pages', 'toppages', 'pageslespluspopulaires', 'url', 'landingpage'],
  clicks: ['clicks', 'clics'],
  impressions: ['impressions'],
  position: ['position', 'averageposition', 'positionmoyenne'],
  ctr: ['ctr', 'tauxdeclics'],
  date: ['date'],
  startDate: ['startdate', 'datedebut', 'debut'],
  endDate: ['enddate', 'datefin', 'fin'],
  country: ['country', 'pays'],
  device: ['device', 'appareil', 'appareils'],
  searchType: ['searchtype', 'typederecherche'],
};

const demand = (condition, message) => { if (!condition) throw new Error(message); };

export function isoDate(value, label = 'date') {
  demand(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label}: expected YYYY-MM-DD.`);
  const date = new Date(value + 'T00:00:00Z');
  demand(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, `${label}: invalid calendar date.`);
  return value;
}

/** RFC 4180 quoting, BOM and French semicolon exports; never splits quoted commas/newlines. */
export function parseCsv(source, separator) {
  const text = source.replace(/^\uFEFF/, '');
  const countFirst = (candidate) => {
    let count = 0, quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && /[\r\n]/.test(char)) break;
      else if (!quoted && char === candidate) count++;
    }
    return count;
  };
  const delimiter = separator || (countFirst(';') > countFirst(',') ? ';' : ',');
  demand([',', ';', '\t'].includes(delimiter), 'Unsupported CSV delimiter.');
  const rows = [];
  let row = [], field = '', quoted = false, closedQuote = false;
  const finishField = () => { row.push(field); field = ''; closedQuote = false; };
  const finishRow = () => { finishField(); if (row.some((value) => value.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else field += char;
    } else if (char === delimiter) finishField();
    else if (char === '\r' || char === '\n') { finishRow(); if (char === '\r' && text[i + 1] === '\n') i++; }
    else if (char === '"') { demand(field === '' && !closedQuote, 'CSV quote inside an unquoted field.'); quoted = true; }
    else { demand(!closedQuote, 'CSV content after closing quote.'); field += char; }
  }
  demand(!quoted, 'CSV has an unterminated quoted field.');
  if (field || row.length || closedQuote) finishRow();
  demand(rows.length > 0, 'CSV is empty.');
  const [headers, ...values] = rows;
  demand(new Set(headers.map(foldHeader)).size === headers.length, 'CSV contains duplicate header names.');
  for (const [index, cells] of values.entries()) demand(cells.length === headers.length, `CSV row ${index + 2}: ${cells.length} cells for ${headers.length} headers.`);
  return { headers, values, delimiter };
}

function numeric(value, label, integer = false) {
  const compact = String(value).trim().replace(/[\s\u00a0\u202f]/g, '');
  let normalized = compact;
  if (integer && /^\d{1,3}(?:,\d{3})+$/.test(compact)) normalized = compact.replace(/,/g, '');
  else if (!compact.includes('.') && compact.includes(',')) normalized = compact.replace(',', '.');
  demand(/^\d+(?:\.\d+)?$/.test(normalized), `${label}: expected a non-negative number; mixed decimal/group separators are ambiguous.`);
  const number = Number(normalized);
  demand(Number.isFinite(number) && (!integer || Number.isSafeInteger(number)), `${label}: invalid ${integer ? 'integer' : 'number'}.`);
  return number;
}

/** Parse the maintained TypeScript registry without evaluating catalogue/app code. */
export function priorityQueries(file) {
  const require = createRequire(import.meta.url);
  const ts = require('typescript');
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let array;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'QUERY_MAP') array = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  demand(array && ts.isArrayLiteralExpression(array), 'QUERY_MAP must be a literal array in the maintained source registry.');
  const rows = array.elements.map((entry) => {
    demand(ts.isObjectLiteralExpression(entry), 'QUERY_MAP contains a non-object entry.');
    const value = (key) => {
      const property = entry.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(source) === key);
      demand(property && ts.isStringLiteral(property.initializer), `QUERY_MAP ${key} must be a string literal.`);
      return property.initializer.text;
    };
    const query = value('query'), path = value('path');
    demand(path.startsWith('/') && !path.startsWith('//') && !/[?#]/.test(path), 'Priority owner must be a canonical relative path.');
    return { query, target: ORIGIN + path };
  });
  demand(rows.length > 0 && new Set(rows.map((row) => queryKey(row.query))).size === rows.length, 'Priority queries are empty or ambiguous after case/space normalization.');
  // The owner's exact head query is absent from the application registry. Keep both
  // plausible existing owners visible; this measurement list does not choose one.
  if (!rows.some((row) => queryKey(row.query) === 'boutique de boxe')) rows.push({ query: 'boutique de boxe', target: null, candidateTargets: [ORIGIN + '/', ORIGIN + '/boutique-boxe/'], ownerStatus: 'unverified-candidates', measurementOnly: true });
  return rows;
}

export function validateContext(context) {
  demand(context && typeof context === 'object' && !Array.isArray(context), 'Snapshot context must be a JSON object.');
  demand(context.source === 'google-search-console', 'Context source must be google-search-console.');
  demand(context.property === PROPERTY || context.property === ORIGIN + '/', 'Snapshot is for a different Search Console property.');
  demand(['final', 'all', 'unknown'].includes(context.dataState), 'Context dataState must be final, all or unknown; do not label incomplete data final.');
  if (context.startDate) isoDate(context.startDate, 'context.startDate');
  if (context.endDate) isoDate(context.endDate, 'context.endDate');
  if (context.startDate && context.endDate) demand(context.startDate <= context.endDate, 'Context endDate precedes startDate.');
  return context;
}

/** UI Queries.csv remains query-only. Pages.csv cannot be joined to it by row order. */
export function importGscCsv(source, context) {
  validateContext(context);
  const csv = parseCsv(source);
  const columns = Object.fromEntries(Object.entries(headerNames).map(([name, aliases]) => {
    const indexes = csv.headers.flatMap((header, index) => aliases.includes(foldHeader(header)) ? [index] : []);
    demand(indexes.length < 2, `CSV has multiple ${name} columns.`);
    return [name, indexes[0]];
  }));
  for (const name of ['query', 'clicks', 'impressions', 'position']) demand(columns[name] !== undefined, `Missing ${name} column. A standalone Pages/Countries/Devices CSV is not a query export and cannot be joined to Queries.csv.`);
  const value = (cells, key) => columns[key] === undefined ? '' : cells[columns[key]].trim();
  const rows = csv.values.map((cells, index) => {
    const label = `CSV row ${index + 2}`;
    const query = value(cells, 'query');
    demand(query, label + ': empty query.');
    const day = value(cells, 'date');
    const startDate = isoDate(day || value(cells, 'startDate') || context.startDate, label + ' start date');
    const endDate = isoDate(day || value(cells, 'endDate') || context.endDate, label + ' end date');
    demand(startDate <= endDate, label + ': end date precedes start.');
    if (context.startDate) demand(startDate >= context.startDate, label + ': earlier than declared export period.');
    if (context.endDate) demand(endDate <= context.endDate, label + ': later than declared export period.');
    const country = value(cells, 'country') || context.country || null;
    const device = value(cells, 'device') || context.device || null;
    const searchType = value(cells, 'searchType') || context.searchType || null;
    const normalizedDevice = device ? deviceKey(device) : null;
    demand(!device || normalizedDevice, label + ': device must be mobile, desktop or tablet.');
    if (context.country && value(cells, 'country')) demand(countryKey(context.country) === countryKey(country), label + ': country contradicts the declared export filter.');
    if (context.device && value(cells, 'device')) demand(deviceKey(context.device) === normalizedDevice, label + ': device contradicts the declared export filter.');
    if (context.searchType && value(cells, 'searchType')) demand(context.searchType.toLowerCase() === searchType.toLowerCase(), label + ': search type contradicts the declared export filter.');
    const page = value(cells, 'page') || null;
    if (page) {
      const url = new URL(page);
      demand(['https:', 'http:'].includes(url.protocol) && ['www.boutique-de-boxe.com', 'boutique-de-boxe.com'].includes(url.hostname) && !url.username && !url.password && !url.hash, label + ': invalid shop page URL.');
    }
    const impressions = numeric(value(cells, 'impressions'), label + ' impressions', true);
    const clicks = numeric(value(cells, 'clicks'), label + ' clicks', true);
    demand(clicks <= impressions, label + ': clicks exceed impressions.');
    const positionValue = value(cells, 'position');
    const position = positionValue ? numeric(positionValue, label + ' position') : null;
    demand(impressions === 0 || (position !== null && position >= 1), label + ': positive impressions require average position >= 1.');
    const ctr = value(cells, 'ctr');
    if (ctr) {
      const ratio = numeric(ctr.replace(/%$/, '').trim(), label + ' CTR') / (ctr.endsWith('%') ? 100 : 1);
      demand(ratio <= 1, label + ': CTR must be a ratio from 0 to 1 or a percentage with %.');
    }
    return { query, page, startDate, endDate, country: country ? countryKey(country) : null, device: normalizedDevice, searchType: searchType ? searchType.toLowerCase() : null, clicks, impressions, position };
  });
  const withPage = rows.filter((row) => row.page).length;
  demand(withPage === 0 || withPage === rows.length, 'Mixed query-only and query/page rows would double-count evidence. Import them as separate snapshots.');
  const periods = new Map();
  for (const row of rows) {
    const key = JSON.stringify([queryKey(row.query), row.page, row.country, row.device, row.searchType]);
    const group = periods.get(key) || [];
    group.push(row);
    periods.set(key, group);
  }
  for (const group of periods.values()) {
    const sorted = [...group].sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (let i = 1; i < sorted.length; i++) demand(sorted[i].startDate > sorted[i - 1].endDate, `Overlapping or duplicate periods for ${sorted[i].query} / ${sorted[i].page || 'query-only'}; daily and period totals must not be mixed.`);
  }
  return { rows, dimensions: withPage > 0 ? 'query-page' : 'query-only', context };
}

export const registryHash = (priorities) => createHash('sha256').update(JSON.stringify(priorities)).digest('hex');
const metric = (rows) => {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  return { rows: rows.length, impressions, clicks, ctr: impressions ? clicks / impressions : null, averagePosition: impressions ? rows.reduce((sum, row) => sum + (row.position || 0) * row.impressions, 0) / impressions : null };
};

export function analyzeSnapshot(imported, priorities, { minImpressions = 20, generatedAt = new Date().toISOString() } = {}) {
  demand(Number.isSafeInteger(minImpressions) && minImpressions > 0, 'minImpressions must be a positive integer.');
  demand(priorities.length && new Set(priorities.map((row) => queryKey(row.query))).size === priorities.length, 'Ambiguous priority registry.');
  const segments = new Map();
  for (const row of imported.rows) {
    const key = JSON.stringify([row.country, row.device, row.searchType]);
    const group = segments.get(key) || [];
    group.push(row);
    segments.set(key, group);
  }
  const details = [...segments].map(([key, rows]) => {
    const [country, device, searchType] = JSON.parse(key);
    const segmentComplete = Boolean(country && device && searchType === 'web' && imported.context.dataState === 'final');
    const queries = priorities.map(({ query, target, candidateTargets = [] }) => {
      const matching = rows.filter((row) => queryKey(row.query) === queryKey(query));
      // Page-dimensional metrics describe that page. Never add competing URLs into a site query rank.
      const selected = imported.dimensions === 'query-page' ? matching.filter((row) => row.page === target) : matching;
      const observed = metric(selected);
      const enough = segmentComplete && observed.impressions >= minImpressions;
      const status = imported.dimensions === 'query-page' && !target && matching.some((row) => row.impressions > 0) ? 'owner-unverified'
        : !selected.length || !observed.impressions ? 'unobserved'
        : !enough ? 'insufficient-evidence'
          : observed.averagePosition <= 10 ? 'average-position-1-10'
            : observed.averagePosition <= 20 ? 'near-first-page-average'
              : 'average-position-beyond-20';
      const otherLandingPages = imported.dimensions === 'query-page'
        ? [...new Set(matching.filter((row) => row.page !== target).map((row) => row.page))].map((page) => ({ page, ...metric(matching.filter((row) => row.page === page)) }))
        : null;
      return { query, target, candidateTargets, ownerStatus: target ? 'intended-from-registry' : 'unverified-candidates', measuredScope: imported.dimensions === 'query-page' ? target ? 'intended-owner-query-page' : 'query-page-owner-unresolved' : 'property-query-owner-unverified', ...observed, hasReportedImpressions: matching.some((row) => row.impressions > 0), status, ownerVerified: Boolean(target && imported.dimensions === 'query-page' && selected.length > 0), otherLandingPages };
    });
    return {
      country, device, searchType,
      contextCompleteForComparison: segmentComplete,
      proxyCoverage: {
        targetQueries: priorities.length,
        majorityThreshold: Math.floor(priorities.length / 2) + 1,
        queriesWithImpressions: queries.filter((row) => row.hasReportedImpressions).length,
        queriesAtAveragePosition1To10: queries.filter((row) => row.status === 'average-position-1-10').length,
        nearFirstPageAverageQueries: queries.filter((row) => row.status === 'near-first-page-average').length,
        insufficientOrUnobservedQueries: queries.filter((row) => ['unobserved', 'insufficient-evidence', 'owner-unverified'].includes(row.status)).length,
        verifiedOrganicTop10Queries: null,
        firstPageGoalEstablished: false,
      },
      queries,
      outsideWatchlistRows: rows.filter((row) => !priorities.some((priority) => queryKey(priority.query) === queryKey(row.query))).sort((a, b) => b.impressions - a.impressions).slice(0, 50),
    };
  });
  const period = imported.rows.length ? {
    startDate: imported.context.startDate || imported.rows.map((row) => row.startDate).sort()[0],
    endDate: imported.context.endDate || imported.rows.map((row) => row.endDate).sort().at(-1),
  } : null;
  if (period) demand(period.endDate <= generatedAt.slice(0, 10), 'Reporting period is in the future.');
  return {
    schemaVersion: SCHEMA_VERSION, generatedAt, source: 'google-search-console-export', property: imported.context.property,
    prioritiesHash: registryHash(priorities), priorityQueries: priorities.length, inputRows: imported.rows.length,
    dimensions: imported.dimensions, dataState: imported.context.dataState, period, minImpressions,
    sourceContextDeclaredByImporter: imported.context,
    confidenceScore: null,
    limitations: [
      'Export provenance, declared filters and final-data state are not independently authenticated by this offline tool.',
      'A missing query is unobserved, not proof of zero impressions, deindexing or a ranking outside the top 10; Search Console omits some rows.',
      'GSC average position is not a fixed organic rank or proof of first-page coverage. Country/device filtering does not identify a searcher city.',
      'Page-dimensional rows are measured per URL; competing landing URLs are not summed into property-level query positions or labeled cannibalization.',
      'Query-only UI exports cannot establish the intended landing page. Separate Queries.csv and Pages.csv are never joined.',
      'The minimum-impression rule is an operational triage threshold, not statistical significance or a Google rule.',
      'This report does not infer recrawl status, Google-selected canonical, Merchant approval or an 8/10 ranking probability.',
    ],
    segments: details,
  };
}

export function compareSnapshots(baseline, current) {
  const reasons = [];
  if (baseline.schemaVersion !== SCHEMA_VERSION || current.schemaVersion !== SCHEMA_VERSION) reasons.push('incompatible report schema');
  if (baseline.property !== current.property) reasons.push('different properties');
  if (baseline.prioritiesHash !== current.prioritiesHash) reasons.push('different priority registries');
  if (baseline.dimensions !== current.dimensions) reasons.push('query-only and query/page reports cannot be compared');
  if (baseline.minImpressions !== current.minImpressions) reasons.push('different impression thresholds');
  if (baseline.dataState !== 'final' || current.dataState !== 'final') reasons.push('incomplete or unverified data state');
  if (!baseline.period || !current.period) reasons.push('missing reporting period');
  else {
    const length = (period) => Date.parse(period.endDate) - Date.parse(period.startDate);
    if (length(baseline.period) !== length(current.period)) reasons.push('different period lengths');
    if (baseline.period.endDate >= current.period.startDate) reasons.push('overlapping or non-chronological periods');
  }
  if (reasons.length) return { comparable: false, reasons, segments: [], causalAttribution: 'not established' };
  const segments = current.segments.map((segment) => {
    const before = baseline.segments.find((old) => old.country === segment.country && old.device === segment.device && old.searchType === segment.searchType);
    if (!before || !before.contextCompleteForComparison || !segment.contextCompleteForComparison) return { country: segment.country, device: segment.device, searchType: segment.searchType, comparable: false, reason: 'matching final Web country/device segment unavailable', queries: [] };
    const queries = segment.queries.map((row) => {
      const old = before.queries.find((item) => queryKey(item.query) === queryKey(row.query));
      const enough = old && old.impressions >= baseline.minImpressions && row.impressions >= current.minImpressions;
      return {
        query: row.query, target: row.target, comparable: Boolean(enough),
        reason: enough ? null : 'insufficient impressions in one or both periods',
        previousAveragePosition: enough ? old.averagePosition : null,
        currentAveragePosition: enough ? row.averagePosition : null,
        averagePositionChange: enough ? row.averagePosition - old.averagePosition : null,
        clicksChange: enough ? row.clicks - old.clicks : null,
        impressionsChange: enough ? row.impressions - old.impressions : null,
      };
    });
    return { country: segment.country, device: segment.device, searchType: segment.searchType, comparable: true, queries };
  });
  return { comparable: segments.some((segment) => segment.comparable), reasons: [], baselinePeriod: baseline.period, currentPeriod: current.period, averagePositionChangeConvention: 'negative is an improvement in the reported GSC average', causalAttribution: 'not established; changes can reflect demand, competition, query mix and Google updates', segments };
}

export function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

/** A human's recorded Google organic result; no browser automation or CAPTCHA handling. */
export function importManualCsv(source) {
  const { headers, values } = parseCsv(source);
  const required = ['query', 'observed_at', 'country', 'search_location', 'device', 'language', 'status', 'organic_position', 'landing_url', 'organic_depth_checked', 'evidence_ref'];
  const indexes = Object.fromEntries(required.map((key) => [key, headers.indexOf(key)]));
  for (const key of required) demand(indexes[key] >= 0, `Manual CSV missing ${key}. Use the header-only template.`);
  const rows = values.map((cells, index) => {
    const get = (key) => cells[indexes[key]].trim();
    const label = `Manual row ${index + 2}`;
    const query = get('query'), observedAt = get('observed_at'), status = get('status');
    demand(query, label + ': empty query.');
    demand(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(observedAt) && Number.isFinite(Date.parse(observedAt)), label + ': observed_at needs an ISO timestamp including timezone.');
    isoDate(observedAt.slice(0, 10), label + ' observation date');
    demand(['found', 'not-found', 'blocked', 'unmeasured'].includes(status), label + ': status must be found, not-found, blocked or unmeasured.');
    const country = get('country'), location = get('search_location'), device = get('device'), language = get('language');
    const normalizedDevice = device ? deviceKey(device) : null;
    demand(!device || normalizedDevice, label + ': unknown device.');
    const rankText = get('organic_position'), depthText = get('organic_depth_checked');
    const position = rankText ? numeric(rankText, label + ' organic position', true) : null;
    const depth = depthText ? numeric(depthText, label + ' depth', true) : 0;
    const landing = get('landing_url') || null, evidence = get('evidence_ref') || null;
    if (status === 'found') {
      demand(position && depth >= position && landing, label + ': found requires an organic rank, shop landing URL and checked depth >= rank.');
      const url = new URL(landing);
      demand(['http:', 'https:'].includes(url.protocol) && ['www.boutique-de-boxe.com', 'boutique-de-boxe.com'].includes(url.hostname) && !url.username && !url.password, label + ': landing is not this shop.');
    } else demand(position === null && landing === null, label + ': non-found observations must not carry an invented rank or landing URL.');
    if (status === 'not-found') demand(depth >= 10, label + ': not-found requires checking at least 10 organic results.');
    if (['blocked', 'unmeasured'].includes(status)) demand(depth === 0, label + ': blocked/unmeasured must keep checked depth zero.');
    if (['found', 'not-found'].includes(status)) demand(evidence, label + ': a measured result needs its screenshot/log evidence reference.');
    return { query, observedAt, observationDate: new Date(observedAt).toISOString().slice(0, 10), country: country ? countryKey(country) : null, searchLocation: location || null, device: normalizedDevice, language: language || null, status, organicPosition: position, organicDepthChecked: depth, landingUrl: landing, evidenceRef: evidence };
  });
  const keys = rows.map((row) => JSON.stringify([queryKey(row.query), row.observationDate, row.country, row.searchLocation, row.device, row.language]));
  demand(new Set(keys).size === keys.length, 'Duplicate same-day query/location/device observations: use separate snapshots rather than selecting the better result.');
  return rows;
}

export function analyzeManual(rows, priorities, generatedAt = new Date().toISOString()) {
  const groups = new Map();
  for (const row of rows) {
    demand(Date.parse(row.observedAt) <= Date.parse(generatedAt), 'Manual observation is in the future.');
    const key = JSON.stringify([row.observationDate, row.country, row.searchLocation, row.device, row.language]);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  const segments = [...groups].map(([key, group]) => {
    const [date, country, searchLocation, device, language] = JSON.parse(key);
    const contextComplete = Boolean(country && searchLocation && device && language);
    const queries = priorities.map(({ query, target, candidateTargets = [] }) => {
      const row = group.find((entry) => queryKey(entry.query) === queryKey(query));
      const usable = Boolean(contextComplete && row && ['found', 'not-found'].includes(row.status));
      return { query, target, candidateTargets, ownerStatus: target ? 'intended-from-registry' : 'unverified-candidates', observation: row || null, measured: usable, recordedOrganicTop10: usable ? row.status === 'found' && row.organicPosition <= 10 : null, intendedOwner: target && usable && row.status === 'found' ? row.landingUrl === target : null };
    });
    const top10 = queries.filter((query) => query.recordedOrganicTop10 === true).length;
    const threshold = Math.floor(priorities.length / 2) + 1;
    return { date, country, searchLocation, device, language, contextComplete, coverage: { targetQueries: priorities.length, measuredQueries: queries.filter((row) => row.measured).length, unmeasuredQueries: queries.filter((row) => !row.measured).length, recordedOrganicTop10Queries: top10, majorityThreshold: threshold, recordedMajorityInThisSample: contextComplete && top10 >= threshold }, queries, outsideWatchlistObservations: group.filter((row) => !priorities.some((priority) => queryKey(priority.query) === queryKey(row.query))) };
  });
  return { schemaVersion: SCHEMA_VERSION, generatedAt, source: 'manual-google-organic-observation', prioritiesHash: registryHash(priorities), priorityQueries: priorities.length, inputRows: rows.length, confidenceScore: null, limitations: ['Records are declared by their author; this offline tool does not authenticate screenshots, Google, physical location or result ordering.', 'Use organic Web positions only; exclude ads, Maps, Shopping and AI modules from organic rank counting.', 'Declared location must come from the search context, not from the city named in the query or a URL parameter alone.', 'CAPTCHA/blocked results stay unmeasured. No bypass or automated Google scraping is implemented.', 'A recorded top-10 observation applies only to that date/location/device/language sample. It is not a universal rank, forecast or causal proof.', 'Not-found means absent from the checked organic depth; it does not establish deindexing.'], segments };
}

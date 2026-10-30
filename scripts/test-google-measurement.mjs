// Synthetic in-memory fixtures only. These never become a real ranking baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { analyzeManual, analyzeSnapshot, compareSnapshots, importGscCsv, importManualCsv, parseCsv, priorityQueries, PROPERTY } from './lib/google-measurement.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const priorities = [
  { query: 'Gants de boxe', target: 'https://www.boutique-de-boxe.com/gants-de-boxe/' },
  { query: 'Équipement MMA', target: 'https://www.boutique-de-boxe.com/materiel-mma/' },
  { query: 'Sac de frappe', target: 'https://www.boutique-de-boxe.com/sacs-de-frappe/' },
];
const context = { source: 'google-search-console', property: PROPERTY, startDate: '2026-10-01', endDate: '2026-10-07', country: 'FRA', device: 'MOBILE', searchType: 'web', dataState: 'final' };
const at = '2026-10-24T12:00:00Z';
const analyze = (text, config = context, options = {}) => analyzeSnapshot(importGscCsv(text, config), priorities, { generatedAt: at, ...options });
const manualHeader = 'query,observed_at,country,search_location,device,language,status,organic_position,landing_url,organic_depth_checked,evidence_ref\n';

test('maintained priority registry is read without executing application modules', () => {
  const rows = priorityQueries(resolve(root, 'lib/seo-copy.ts'));
  assert.equal(rows.length, 41);
  assert.ok(rows.some((row) => row.query === 'Boutique de boxe Toulouse' && row.target.endsWith('/boutique-de-boxe-toulouse/')));
  assert.ok(rows.some((row) => row.query === 'Gants de boxe'));
  const core = rows.find((row) => row.query === 'boutique de boxe');
  assert.equal(core.target, null);
  assert.equal(core.measurementOnly, true);
  assert.equal(core.ownerStatus, 'unverified-candidates');
  assert.deepEqual(core.candidateTargets, ['https://www.boutique-de-boxe.com/', 'https://www.boutique-de-boxe.com/boutique-boxe/']);
});

test('BOM, quoted commas/newlines/quotes and French semicolons parse correctly', () => {
  assert.deepEqual(parseCsv('\uFEFFa;b\r\n"x; y";"a\r\nb"\r\n').values, [['x; y', 'a\r\nb']]);
  assert.deepEqual(parseCsv('a,b\n"a,""quoted""",z\n').values, [['a,"quoted"', 'z']]);
  assert.throws(() => parseCsv('a,b\n"open,z'), /unterminated/);
  assert.throws(() => parseCsv('a,b\n"closed"tail,z'), /after closing quote/);
  assert.throws(() => parseCsv('a,b\nx,y,z'), /cells/);
  assert.throws(() => parseCsv('Query, query\na,b'), /duplicate header/);
});

test('French UI Queries export is useful but never invented as a query-page join', () => {
  const report = analyze('Requêtes les plus fréquentes;Clics;Impressions;CTR;Position\nGants de boxe;3;100;3 %;8,5\n');
  const row = report.segments[0].queries[0];
  assert.equal(report.dimensions, 'query-only');
  assert.equal(row.averagePosition, 8.5);
  assert.equal(row.ownerVerified, false);
  assert.equal(row.measuredScope, 'property-query-owner-unverified');
  assert.equal(row.otherLandingPages, null);
  assert.equal(report.segments[0].proxyCoverage.queriesAtAveragePosition1To10, 1);
  assert.equal(report.segments[0].proxyCoverage.verifiedOrganicTop10Queries, null);
  assert.equal(report.segments[0].proxyCoverage.firstPageGoalEstablished, false);
  assert.equal(report.confidenceScore, null);
  assert.throws(() => importGscCsv('Top pages,Clicks,Impressions,Position\nhttps://www.boutique-de-boxe.com/,2,20,4', context), /standalone Pages/);
});

test('non-owner landings are shown separately and never folded into intended owner rank', () => {
  const csv = 'query,page,clicks,impressions,position\nGants de boxe,https://www.boutique-de-boxe.com/boutique-boxe/,5,100,3\n';
  const row = analyze(csv).segments[0].queries[0];
  assert.equal(row.status, 'unobserved');
  assert.equal(row.averagePosition, null);
  assert.equal(row.otherLandingPages[0].averagePosition, 3);
  assert.equal(row.otherLandingPages[0].page, 'https://www.boutique-de-boxe.com/boutique-boxe/');
});

test('mandatory core query retains candidate pages without selecting an owner or claiming cannibalisation', () => {
  const watchlist = priorityQueries(resolve(root, 'lib/seo-copy.ts'));
  const csv = 'query,page,clicks,impressions,position\nboutique de boxe,https://www.boutique-de-boxe.com/,1,30,4\nboutique de boxe,https://www.boutique-de-boxe.com/boutique-boxe/,1,40,6';
  const report = analyzeSnapshot(importGscCsv(csv, context), watchlist, { generatedAt: at });
  const core = report.segments[0].queries.find((row) => row.query === 'boutique de boxe');
  assert.equal(core.target, null);
  assert.equal(core.status, 'owner-unverified');
  assert.equal(core.ownerVerified, false);
  assert.equal(core.averagePosition, null, 'Do not combine separate candidate-page rows into a made-up query rank');
  assert.equal(core.otherLandingPages.length, 2);
  const manual = manualHeader + 'boutique de boxe,2026-10-24T12:00:00Z,fr,Toulouse,mobile,fr-FR,found,4,https://www.boutique-de-boxe.com/,10,image.png';
  const measured = analyzeManual(importManualCsv(manual), watchlist, at).segments[0].queries.find((row) => row.query === 'boutique de boxe');
  assert.equal(measured.recordedOrganicTop10, true, 'The site observation can be recorded without deciding a permanent owner');
  assert.equal(measured.intendedOwner, null);
  assert.equal(measured.ownerStatus, 'unverified-candidates');
});

test('daily owner rows use impression weights and retain the requested export period', () => {
  const csv = 'query,page,date,clicks,impressions,position\nGants de boxe,https://www.boutique-de-boxe.com/gants-de-boxe/,2026-10-01,1,20,15\nGants de boxe,https://www.boutique-de-boxe.com/gants-de-boxe/,2026-10-02,8,80,5\n';
  const report = analyze(csv), row = report.segments[0].queries[0];
  assert.equal(row.impressions, 100);
  assert.equal(row.averagePosition, 7);
  assert.equal(row.ctr, 0.09);
  assert.equal(row.ownerVerified, true);
  assert.deepEqual(report.period, { startDate: '2026-10-01', endDate: '2026-10-07' });
});

test('overlapping period totals, duplicates and mixed dimension scopes are refused', () => {
  assert.throws(() => analyze('query,clicks,impressions,position\nGants de boxe,1,20,5\nGANTS DE BOXE,1,20,7'), /Overlapping or duplicate/);
  assert.throws(() => analyze('query,page,clicks,impressions,position\nGants de boxe,,1,20,5\nSac de frappe,https://www.boutique-de-boxe.com/sacs-de-frappe/,1,20,7'), /Mixed query-only/);
  const csv = 'query,start_date,end_date,clicks,impressions,position\nGants de boxe,2026-10-01,2026-10-03,1,20,5\nGants de boxe,2026-10-03,2026-10-07,1,20,7';
  assert.throws(() => analyze(csv), /Overlapping/);
});

test('country/device/search type segments stay separate; declared filters must match', () => {
  const csv = 'query,country,device,search_type,clicks,impressions,position\nGants de boxe,fr,mobile,web,1,100,5\nGants de boxe,FRANCE,desktop,web,1,100,18';
  const report = analyze(csv, { ...context, country: null, device: null, searchType: null });
  assert.equal(report.segments.length, 2);
  assert.deepEqual(report.segments.map((segment) => segment.queries[0].averagePosition).sort((a, b) => a - b), [5, 18]);
  assert.throws(() => analyze(csv), /contradicts/);
});

test('small samples, missing context and non-final data remain insufficient evidence', () => {
  const csv = 'query,clicks,impressions,position\nGants de boxe,1,19,1\n';
  assert.equal(analyze(csv).segments[0].queries[0].status, 'insufficient-evidence');
  assert.equal(analyze(csv, { ...context, country: null }).segments[0].contextCompleteForComparison, false);
  assert.equal(analyze(csv, { ...context, dataState: 'all' }, { minImpressions: 1 }).segments[0].queries[0].status, 'insufficient-evidence');
  assert.equal(analyze(csv).segments[0].queries[1].status, 'unobserved');
});

test('wrong properties, impossible dates/counts, missing dates and future evidence fail', () => {
  const csv = 'query,clicks,impressions,position\nGants de boxe,1,20,5\n';
  assert.throws(() => analyze(csv, { ...context, property: 'sc-domain:other.example' }), /different/);
  assert.throws(() => analyze(csv, { ...context, startDate: '2026-02-31' }), /invalid calendar date/);
  assert.throws(() => analyze(csv, { ...context, startDate: null }), /YYYY-MM-DD/);
  assert.throws(() => analyze('query,clicks,impressions,position\nGants de boxe,21,20,5'), /exceed/);
  assert.throws(() => analyze(csv, { ...context, startDate: '2026-11-01', endDate: '2026-11-07' }), /future/);
});

test('comparable non-overlapping equal periods report changes without causal claims', () => {
  const before = analyze('query,clicks,impressions,position\nGants de boxe,1,100,18');
  const after = analyze('query,clicks,impressions,position\nGants de boxe,2,120,12', { ...context, startDate: '2026-10-08', endDate: '2026-10-14' });
  const comparison = compareSnapshots(before, after);
  assert.equal(comparison.comparable, true);
  assert.equal(comparison.segments[0].queries[0].averagePositionChange, -6);
  assert.equal(comparison.segments[0].queries[1].comparable, false);
  assert.match(comparison.causalAttribution, /not established/);
});

test('different durations, overlapping dates, contexts and dimensions cannot be compared', () => {
  const text = 'query,clicks,impressions,position\nGants de boxe,1,100,18';
  const before = analyze(text);
  assert.equal(compareSnapshots(before, before).comparable, false);
  assert.equal(compareSnapshots(before, analyze(text, { ...context, startDate: '2026-10-08', endDate: '2026-10-15' })).comparable, false);
  const after = analyze(text, { ...context, startDate: '2026-10-08', endDate: '2026-10-14', device: 'desktop' });
  assert.equal(compareSnapshots(before, after).comparable, false);
  assert.equal(compareSnapshots(before, { ...after, dimensions: 'query-page' }).comparable, false);
});

test('manual organic samples count only measured evidence under a consistent context', () => {
  const csv = manualHeader + 'Gants de boxe,2026-10-24T12:00:00+01:00,fr,Toulouse,mobile,fr-FR,found,4,https://www.boutique-de-boxe.com/gants-de-boxe/,10,screenshot-gloves.png\nÉquipement MMA,2026-10-24T12:05:00+01:00,fr,Toulouse,mobile,fr-FR,found,8,https://www.boutique-de-boxe.com/materiel-mma/,10,screenshot-mma.png\nSac de frappe,2026-10-24T12:10:00+01:00,fr,Toulouse,mobile,fr-FR,blocked,,,,captcha.png\n';
  const report = analyzeManual(importManualCsv(csv), priorities, at);
  assert.equal(report.segments[0].coverage.recordedOrganicTop10Queries, 2);
  assert.equal(report.segments[0].coverage.recordedMajorityInThisSample, true);
  assert.equal(report.segments[0].coverage.unmeasuredQueries, 1);
  assert.equal(report.segments[0].queries[2].recordedOrganicTop10, null);
  assert.equal(report.confidenceScore, null);
  assert.match(report.limitations.join(' '), /not a universal rank/);
});

test('manual missing location remains unmeasured and shallow/unsupported ranks fail', () => {
  const missing = manualHeader + 'Gants de boxe,2026-10-24T12:00:00Z,fr,,mobile,fr-FR,found,4,https://www.boutique-de-boxe.com/gants-de-boxe/,10,image.png';
  assert.equal(analyzeManual(importManualCsv(missing), priorities, at).segments[0].coverage.measuredQueries, 0);
  assert.throws(() => importManualCsv(manualHeader + 'Gants de boxe,2026-10-24T12:00:00Z,fr,Toulouse,mobile,fr-FR,not-found,,,9,image.png'), /at least 10/);
  assert.throws(() => importManualCsv(manualHeader + 'Gants de boxe,2026-10-24T12:00:00Z,fr,Toulouse,mobile,fr-FR,found,4,https://www.boutique-de-boxe.com/gants-de-boxe/,10,'), /evidence reference/);
  assert.throws(() => importManualCsv(manualHeader + 'Gants de boxe,2026-10-24T12:00:00Z,fr,Toulouse,mobile,fr-FR,blocked,4,https://www.boutique-de-boxe.com/gants-de-boxe/,10,image.png'), /invented rank/);
});

test('manual duplicates, future observations and non-shop landings fail', () => {
  const row = 'Gants de boxe,2026-10-24T12:00:00Z,fr,Toulouse,mobile,fr-FR,found,4,https://www.boutique-de-boxe.com/gants-de-boxe/,10,image.png\n';
  assert.throws(() => importManualCsv(manualHeader + row + row), /Duplicate/);
  assert.throws(() => analyzeManual(importManualCsv(manualHeader + row.replace('2026-10-24', '2026-10-25')), priorities, at), /future/);
  assert.throws(() => importManualCsv(manualHeader + row.replace('www.boutique-de-boxe.com/gants-de-boxe/', 'other.example/')), /not this shop/);
});

test('CLI initialises genuine empty inventory and refuses to overwrite evidence', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'boutique-google-evidence-'));
  const run = (...args) => spawnSync(process.execPath, [resolve(root, 'scripts/measure-google-progress.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  try {
    assert.equal(run('--init', dir).status, 0);
    const state = JSON.parse(readFileSync(resolve(dir, 'evidence-state.json'), 'utf8'));
    assert.equal(state.priorityQueries, 41);
    assert.equal(state.applicationRegistryQueries, 40);
    assert.equal(state.mandatoryMeasurementOnlyQueries, 1);
    assert.equal(state.observedRows, 0);
    assert.equal(state.confidenceScore, null);
    assert.equal(state.googleSearchConsoleAccessRequired, false);
    assert.equal(parseCsv(readFileSync(resolve(dir, 'manual-organic.template.csv'), 'utf8')).values.length, 0);
    assert.equal(run('--init', dir).status, 1);
    const evidence = resolve(dir, 'input.csv');
    writeFileSync(evidence, 'do not overwrite original evidence');
    assert.equal(run('--manual', evidence, '--out', evidence).status, 1);
    assert.equal(readFileSync(evidence, 'utf8'), 'do not overwrite original evidence');
  } finally {
    const target = resolve(dir);
    assert.equal(dirname(target), resolve(tmpdir()), 'Cleanup remains in the explicitly named temp directory');
    assert.ok(basename(target).startsWith('boutique-google-evidence-'), 'Cleanup remains in the test-created directory');
    rmSync(target, { recursive: true, force: true });
  }
});

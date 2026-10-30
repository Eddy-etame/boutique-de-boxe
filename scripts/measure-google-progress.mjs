#!/usr/bin/env node
// Local, read-only evidence ingestion. No Google sign-in, API, scraping or production connection.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeManual, analyzeSnapshot, compareSnapshots, csvCell, importGscCsv, importManualCsv, priorityQueries, registryHash, PROPERTY } from './lib/google-measurement.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const help = `Offline Google evidence tool (no Search Console access required).

  node scripts/measure-google-progress.mjs --init outputs/google-evidence
  node scripts/measure-google-progress.mjs --manual work/organic.csv --out outputs/organic-2026-10-24.json
  node scripts/measure-google-progress.mjs --input work/queries.csv --context work/export-context.json --out outputs/gsc-baseline.json
  node scripts/measure-google-progress.mjs --input work/later.csv --context work/later-context.json --baseline outputs/gsc-baseline.json --out outputs/gsc-comparison.json

--init creates the watchlist inventory and header-only templates: no invented observations.
--manual imports documented human Google organic observations; a blocked result stays unmeasured.
--input imports an optional genuine GSC CSV supplied by the account holder.
--context records the actual GSC property, dates, filters and final/all/unknown data state.
--min-impressions 20 sets the operational GSC triage threshold; it is not statistical significance.
Reports never manufacture an 8/10 probability or equate average GSC position with fixed first-page rank.
Output files are new files only; original evidence is never overwritten.
See docs/SEO-MEASUREMENT.md.`;

const args = process.argv.slice(2), options = {};
const allowed = new Set(['init', 'manual', 'input', 'context', 'baseline', 'out', 'min-impressions']);
try {
  if (!args.length || args.includes('--help')) { console.log(help); process.exitCode = 0; }
  else {
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace(/^--/, '');
      if (!args[i]?.startsWith('--') || !allowed.has(key) || !args[i + 1] || args[i + 1].startsWith('--') || options[key] !== undefined) throw new Error('Invalid or duplicate option: ' + args[i]);
      options[key] = args[i + 1];
    }
    const priorities = priorityQueries(resolve(root, 'lib/seo-copy.ts'));
    const read = (file) => {
      if (statSync(file).size > 50 * 1024 * 1024) throw new Error('Evidence file exceeds 50 MB; split into declared, non-overlapping snapshots.');
      return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    };
    const writeNew = (file, content) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content, { flag: 'wx' }); };
    if (options.init) {
      if (Object.keys(options).length !== 1) throw new Error('--init cannot be combined with import options.');
      const dir = resolve(options.init);
      const files = {
        'priority-queries.csv': 'query,target_url,candidate_urls,owner_status,scope_source,measurement_state\r\n' + priorities.map(({ query, target, candidateTargets = [], measurementOnly = false }) => [query, target || '', candidateTargets.join(' | '), target ? 'intended-from-registry' : 'unverified-candidates', measurementOnly ? 'mandatory-measurement-only' : 'application-registry', 'unmeasured'].map(csvCell).join(',')).join('\r\n') + '\r\n',
        'manual-organic.template.csv': 'query,observed_at,country,search_location,device,language,status,organic_position,landing_url,organic_depth_checked,evidence_ref\r\n',
        'gsc-observations.template.csv': 'query,page,date,country,device,searchType,clicks,impressions,position,ctr\r\n',
        'gsc-context.template.json': JSON.stringify({ source: 'google-search-console', property: PROPERTY, startDate: null, endDate: null, country: null, device: null, searchType: null, dataState: 'unknown', exportNotes: 'Fill only from the genuine export and actual filters. Optional: supplied by the account holder; no sign-in is required by this tool.' }, null, 2) + '\n',
        'evidence-state.json': JSON.stringify({ generatedAt: new Date().toISOString(), status: 'awaiting-genuine-observations', priorityQueries: priorities.length, applicationRegistryQueries: priorities.filter((row) => !row.measurementOnly).length, mandatoryMeasurementOnlyQueries: priorities.filter((row) => row.measurementOnly).length, prioritiesHash: registryHash(priorities), majorityThreshold: Math.floor(priorities.length / 2) + 1, observedRows: 0, measuredRankings: null, confidenceScore: null, firstPageGoalEstablished: false, googleSearchConsoleAccessRequired: false, watchlistDefinition: `${priorities.filter((row) => !row.measurementOnly).length} application queries plus ${priorities.filter((row) => row.measurementOnly).length} explicit measurement-only query. Where the core owner is unresolved, homepage and /boutique-boxe/ remain candidates. See inventory owner_status; the application registry was not modified.`, note: 'The inventory and templates are not a ranking baseline. No data is inferred from the site audit or semantic search ordering.' }, null, 2) + '\n',
      };
      for (const name of Object.keys(files)) if (existsSync(resolve(dir, name))) throw new Error('Refusing to overwrite existing evidence/template: ' + resolve(dir, name));
      for (const [name, content] of Object.entries(files)) writeNew(resolve(dir, name), content);
      console.log(`Created ${priorities.length} unmeasured priority queries and empty templates in ${dir}. No Google rankings measured.`);
    } else {
      if (Boolean(options.input) === Boolean(options.manual) || !options.out) throw new Error('Choose --manual or --input, and provide a new --out report path.');
      if (options.manual && (options.context || options.baseline || options['min-impressions'])) throw new Error('GSC context/baseline/impression options do not apply to manual observations.');
      const input = resolve(options.input || options.manual), output = resolve(options.out);
      for (const source of [input, options.context && resolve(options.context), options.baseline && resolve(options.baseline)].filter(Boolean)) if (source === output) throw new Error('The output must not overwrite original evidence/context/baseline.');
      if (existsSync(output)) throw new Error('Report already exists; choose a new --out filename.');
      let report;
      if (options.manual) report = analyzeManual(importManualCsv(read(input)), priorities);
      else {
        if (!options.context) throw new Error('--context is required for a GSC export. Record the real dates/filters; do not guess them.');
        const imported = importGscCsv(read(input), JSON.parse(read(resolve(options.context))));
        report = analyzeSnapshot(imported, priorities, { minImpressions: options['min-impressions'] === undefined ? 20 : Number(options['min-impressions']) });
        if (options.baseline) report.comparison = compareSnapshots(JSON.parse(read(resolve(options.baseline))), report);
      }
      report.inputFile = input;
      writeNew(output, JSON.stringify(report, null, 2) + '\n');
      console.log(JSON.stringify({ report: output, source: report.source, inputRows: report.inputRows, priorityQueries: report.priorityQueries, segments: report.segments.length, confidenceScore: null, note: 'Recorded evidence only; read report limitations. No guaranteed Google outcome.' }));
    }
  }
} catch (error) {
  console.error('Evidence import failed:', error.message);
  process.exitCode = 1;
}

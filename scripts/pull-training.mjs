/**
 * Pulls the real Workout Buddy training export and, when it validates,
 * replaces data/training.json with placeholder honestly set to false.
 *
 *   node scripts/pull-training.mjs        (npm run data:pull)
 *
 * Contract
 * --------
 * Environment:
 *   TRAINING_EXPORT_URL     GET endpoint returning the JSON export. When it
 *                           is unset this script prints a skip notice and
 *                           exits 0 — the placeholder data stays untouched.
 *   TRAINING_EXPORT_TOKEN   Optional. Sent as "Authorization: Bearer <token>".
 *
 * The endpoint must return exactly the schema scripts/build-field-data.mjs
 * consumes (the shape of the current data/training.json):
 *
 *   {
 *     "athlete":  string,
 *     "unit":     "lb",              // downstream figures are labelled volumeLb
 *     "exported": "YYYY-MM-DD",
 *     "lifts":    [{ "id": string, "name": string }],
 *                                    // 1..16 lifts, unique ids — the field
 *                                    // buffer packs the lift index into 4 bits
 *     "sessions": [{                 // >= 2, dates non-decreasing
 *       "date":    "YYYY-MM-DD",
 *       "block":   string,           // optional
 *       "entries": [{                // >= 1 per session
 *         "lift":   string,          // must match a lifts[].id
 *         "sets":   int,             // == logged.length
 *         "reps":   int >= 1,        // the planned scheme
 *         "weight": number > 0,      // the planned bar weight
 *         "logged": [{ "weight": number, "reps": int }]  // >= 1 actual sets
 *       }]
 *     }]
 *   }
 *
 * Sanity guards (mirroring or protecting the consumer):
 *   - lifts.length <= 16              build-field-data.mjs throws above this
 *   - every entry.lift resolves       build-field-data.mjs throws on unknowns
 *   - session dates non-decreasing,   the time axis divides by the date span
 *     first < last
 *   - logged reps 1..100 per set,     the buffer expands one point per rep;
 *     logged weight 0 < w <= 1500 lb  values outside this are a corrupt
 *                                     export, not a lift
 *   - at least two distinct e1RM      the intensity axis divides by the
 *     values across all logged sets   e1RM range
 *
 * Behaviour:
 *   - valid export    -> writes data/training.json (canonical fields only,
 *                        placeholder: false unless the export itself says
 *                        true) and prints a before/after summary. Run
 *                        `npm run data` afterwards to rebuild the field.
 *   - unset URL       -> skip notice, exit 0.
 *   - fetch/JSON/     -> exit 1, first failing record printed.
 *     schema failure
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = resolve(ROOT, 'data/training.json');

/** build-field-data.mjs packs the lift index into 4 bits. */
const MAX_LIFTS = 16;
/** Guards the one-point-per-rep expansion loop against a corrupt export. */
const MAX_SET_REPS = 100;
/** lb. Above this is export corruption, not a personal record. */
const MAX_SET_WEIGHT = 1500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Epley — must match build-field-data.mjs, which divides by the e1RM range. */
const e1rm = (weight, reps) => weight * (1 + reps / 30);

const show = (record) => {
  const json = JSON.stringify(record);
  return json.length > 400 ? `${json.slice(0, 400)}…` : json;
};

function fail(path, record, reason) {
  console.error(`data:pull failed — invalid export`);
  console.error(`  at:     ${path}`);
  console.error(`  reason: ${reason}`);
  console.error(`  record: ${show(record)}`);
  process.exit(1);
}

const isPosInt = (n) => Number.isInteger(n) && n > 0;
const isIsoDate = (s) => typeof s === 'string' && ISO_DATE.test(s) && !Number.isNaN(Date.parse(s));

/** Validates the export strictly; returns the canonical object to write. */
function validate(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail('$', raw, 'export root must be a JSON object');
  }
  if (typeof raw.athlete !== 'string' || raw.athlete.length === 0) {
    fail('athlete', raw.athlete, 'athlete must be a non-empty string');
  }
  if (raw.unit !== 'lb') {
    fail('unit', raw.unit, 'unit must be "lb" — downstream stats are labelled volumeLb');
  }
  if (!isIsoDate(raw.exported)) {
    fail('exported', raw.exported, 'exported must be a YYYY-MM-DD date');
  }

  if (!Array.isArray(raw.lifts) || raw.lifts.length === 0) {
    fail('lifts', raw.lifts, 'lifts must be a non-empty array');
  }
  if (raw.lifts.length > MAX_LIFTS) {
    fail('lifts', `${raw.lifts.length} lifts`, `at most ${MAX_LIFTS} lifts — the field buffer packs the lift index into 4 bits`);
  }
  const liftIds = new Set();
  const lifts = raw.lifts.map((lift, i) => {
    if (typeof lift !== 'object' || lift === null) fail(`lifts[${i}]`, lift, 'lift must be an object');
    if (typeof lift.id !== 'string' || lift.id.length === 0) fail(`lifts[${i}].id`, lift, 'id must be a non-empty string');
    if (typeof lift.name !== 'string' || lift.name.length === 0) fail(`lifts[${i}].name`, lift, 'name must be a non-empty string');
    if (liftIds.has(lift.id)) fail(`lifts[${i}].id`, lift, `duplicate lift id "${lift.id}"`);
    liftIds.add(lift.id);
    return { id: lift.id, name: lift.name };
  });

  if (!Array.isArray(raw.sessions) || raw.sessions.length < 2) {
    fail('sessions', raw.sessions, 'sessions must be an array of at least 2 sessions — the time axis divides by the date span');
  }

  const distinctRm = new Set();
  let prevTime = -Infinity;
  const sessions = raw.sessions.map((session, i) => {
    const at = `sessions[${i}]`;
    if (typeof session !== 'object' || session === null) fail(at, session, 'session must be an object');
    if (!isIsoDate(session.date)) fail(`${at}.date`, session, 'date must be a YYYY-MM-DD date');
    const time = Date.parse(session.date);
    if (time < prevTime) fail(`${at}.date`, session, 'session dates must be in non-decreasing order');
    prevTime = time;
    if (session.block !== undefined && (typeof session.block !== 'string' || session.block.length === 0)) {
      fail(`${at}.block`, session, 'block, when present, must be a non-empty string');
    }
    if (!Array.isArray(session.entries) || session.entries.length === 0) {
      fail(`${at}.entries`, session, 'entries must be a non-empty array');
    }

    const entries = session.entries.map((entry, j) => {
      const atE = `${at}.entries[${j}]`;
      if (typeof entry !== 'object' || entry === null) fail(atE, entry, 'entry must be an object');
      if (!liftIds.has(entry.lift)) fail(`${atE}.lift`, entry, `unknown lift "${entry.lift}" — every entry.lift must match a lifts[].id`);
      if (!isPosInt(entry.reps)) fail(`${atE}.reps`, entry, 'reps must be a positive integer');
      if (!Number.isFinite(entry.weight) || entry.weight <= 0) fail(`${atE}.weight`, entry, 'weight must be a positive number');
      if (!Array.isArray(entry.logged) || entry.logged.length === 0) fail(`${atE}.logged`, entry, 'logged must be a non-empty array');
      if (entry.sets !== entry.logged.length) fail(`${atE}.sets`, entry, `sets (${entry.sets}) must equal logged.length (${entry.logged.length})`);

      const logged = entry.logged.map((set, k) => {
        const atS = `${atE}.logged[${k}]`;
        if (typeof set !== 'object' || set === null) fail(atS, set, 'logged set must be an object');
        if (!isPosInt(set.reps) || set.reps > MAX_SET_REPS) {
          fail(`${atS}.reps`, set, `reps must be an integer between 1 and ${MAX_SET_REPS} — the field expands one point per rep`);
        }
        if (!Number.isFinite(set.weight) || set.weight <= 0 || set.weight > MAX_SET_WEIGHT) {
          fail(`${atS}.weight`, set, `weight must be a number between 0 and ${MAX_SET_WEIGHT} (exclusive/inclusive, lb)`);
        }
        distinctRm.add(e1rm(set.weight, set.reps));
        return { weight: set.weight, reps: set.reps };
      });

      return { lift: entry.lift, sets: entry.sets, reps: entry.reps, weight: entry.weight, logged };
    });

    // Canonical key order: date, block, entries.
    return session.block !== undefined
      ? { date: session.date, block: session.block, entries }
      : { date: session.date, entries };
  });

  if (Date.parse(sessions[sessions.length - 1].date) <= Date.parse(sessions[0].date)) {
    fail('sessions', `${sessions[0].date}..${sessions[sessions.length - 1].date}`, 'the last session must be dated after the first — the time axis divides by the span');
  }
  if (distinctRm.size < 2) {
    fail('sessions', `${distinctRm.size} distinct e1RM value(s)`, 'at least two distinct estimated one-rep-max values are required — the intensity axis divides by the e1RM range');
  }

  return {
    athlete: raw.athlete,
    unit: raw.unit,
    exported: raw.exported,
    // Honesty over convenience: an export that declares itself placeholder
    // stays flagged. Real data — the normal case — flips it to false.
    placeholder: raw.placeholder === true,
    lifts,
    sessions,
  };
}

/** sessions / sets / points (one point per logged rep) for the summary. */
function stats(data) {
  let sets = 0;
  let points = 0;
  for (const session of data.sessions) {
    for (const entry of session.entries) {
      sets += entry.logged.length;
      for (const set of entry.logged) points += set.reps;
    }
  }
  return {
    sessions: data.sessions.length,
    sets,
    points,
    from: data.sessions[0]?.date ?? '—',
    to: data.sessions[data.sessions.length - 1]?.date ?? '—',
    placeholder: data.placeholder === true,
  };
}

// ------------------------------------------------------------------- fetch

const url = process.env.TRAINING_EXPORT_URL;
if (!url) {
  console.log('data:pull skipped — TRAINING_EXPORT_URL is not set. data/training.json left untouched.');
  process.exit(0);
}

const headers = { accept: 'application/json' };
if (process.env.TRAINING_EXPORT_TOKEN) {
  headers.authorization = `Bearer ${process.env.TRAINING_EXPORT_TOKEN}`;
}

let response;
try {
  response = await fetch(url, { headers });
} catch (error) {
  console.error(`data:pull failed — could not reach the export endpoint: ${error.message}`);
  process.exit(1);
}
if (!response.ok) {
  console.error(`data:pull failed — export endpoint answered ${response.status} ${response.statusText}`);
  process.exit(1);
}

let raw;
try {
  raw = await response.json();
} catch (error) {
  console.error(`data:pull failed — export endpoint did not return JSON: ${error.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- validate

const next = validate(raw);
if (next.placeholder) {
  console.warn('data:pull warning — the export declares "placeholder": true, so the flag stays true.');
}

// ------------------------------------------------------------------- write

const before = existsSync(TARGET) ? stats(JSON.parse(readFileSync(TARGET, 'utf8'))) : null;
const after = stats(next);

// Match the committed file's formatting (JSON.stringify indent 1 + newline).
const serialized = `${JSON.stringify(next, null, 1)}\n`;
if (before !== null && readFileSync(TARGET, 'utf8') === serialized) {
  console.log('data:pull — export matches data/training.json exactly, nothing to write.');
  process.exit(0);
}

writeFileSync(TARGET, serialized);

const arrow = (key) => `${before ? before[key] : '—'} -> ${after[key]}`;
console.log(
  [
    `data/training.json written (placeholder: ${before ? before.placeholder : '—'} -> ${after.placeholder})`,
    `  sessions  ${arrow('sessions')}`,
    `  sets      ${arrow('sets')}`,
    `  points    ${arrow('points')}  (one point per logged rep)`,
    `  range     ${before ? `${before.from}..${before.to}` : '—'} -> ${after.from}..${after.to}`,
    `Run \`npm run data\` to rebuild the field from it.`,
  ].join('\n'),
);

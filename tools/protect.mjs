#!/usr/bin/env node
/* Password-protected pages for a public static site. See tools/PROTECT.md.

   node tools/protect.mjs                 build every page in passwords.json, then verify
   node tools/protect.mjs <page> ...      build and verify only these pages
   node tools/protect.mjs --verify [page] verify the built pages without writing anything
   node tools/protect.mjs --restore <page> [--force]
                                          decrypt the published page back into vault/<page>/

   Sources live OUTSIDE this public repo, in the private repo checked out next to it:
   ../private-pages/vault/<page>/ (override with PRIVATE_PAGES=/path/to/private-pages). passwords.json
   sits in that repo's root and is git-ignored there too. The output in <page>/ holds only
   ciphertext: PBKDF2-SHA256 (600k iterations, per-page salt) -> AES-256-GCM. No dependencies. */

import { execFileSync } from 'node:child_process';
import { createCipheriv, createDecipheriv, createHash, createHmac, pbkdf2Sync, randomBytes, webcrypto } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = privateHome();                         // the private repo
const VAULT = join(HOME, 'vault');
const PASSWORDS = join(HOME, 'passwords.json');
const ITER = 600_000;
const MARKER = '<meta name="generator" content="yzy-vault">';
const DATA_RE = /<script type="application\/json" id="vault-data">([\s\S]*?)<\/script>/;
const PAGE_RE = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;
const WARN_BYTES = 50 * 1024 * 1024, MAX_BYTES = 100 * 1024 * 1024;   // GitHub rejects files over 100 MB
const MIME = {
  html: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', xml: 'application/xml', pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  svg: 'image/svg+xml', ico: 'image/x-icon', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf', wasm: 'application/wasm', zip: 'application/zip',
};

class Fail extends Error {}
const fail = (m) => { throw new Fail(m); };
const abs = (...p) => join(ROOT, ...p);
const read = (...p) => readFileSync(abs(...p));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const aad = (page, label) => Buffer.from(`vault1|${page}|${label}`);

/* ---------- crypto (node:crypto here; --verify re-does it with WebCrypto, like the browser) ---------- */
const kdf = (password, salt, iter = ITER) => pbkdf2Sync(password.normalize('NFC'), salt, iter, 32, 'sha256');

function seal(key, bytes, page, label) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv).setAAD(aad(page, label));
  return Buffer.concat([iv, c.update(bytes), c.final(), c.getAuthTag()]);
}
/* Returns the plaintext, or null when the key, the label or the data is wrong. */
function open(key, blob, page, label) {
  if (blob.length < 28) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12)).setAAD(aad(page, label)).setAuthTag(blob.subarray(blob.length - 16));
    return Buffer.concat([d.update(blob.subarray(12, blob.length - 16)), d.final()]);
  } catch { return null; }
}

/* ---------- safety: the plaintext must never be committable to this public repo ---------- */
function git(args, cwd = ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function tryGit(args, cwd) { try { return git(args, cwd); } catch { return null; } }
/* ../private-pages beside the main checkout, also when run from another git worktree. */
function privateHome() {
  if (process.env.PRIVATE_PAGES) return resolve(process.env.PRIVATE_PAGES);
  const common = tryGit(['rev-parse', '--path-format=absolute', '--git-common-dir'], ROOT);
  return join(dirname(common ? dirname(common) : ROOT), 'private-pages');
}
function assertPrivate() {
  if (!existsSync(HOME)) fail(`${HOME} not found. Run: gh repo clone yizhouyu/private-pages ${HOME}`);
  const commonDir = (cwd) => tryGit(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
  const here = commonDir(ROOT), there = commonDir(HOME);
  if (!there) fail(`${HOME} is not a git repository.`);
  if (realpathSync(here) === realpathSync(there)) fail(`${HOME} belongs to this public repository. Refusing to run.`);
  const real = realpathSync(HOME);
  for (const root of [realpathSync(ROOT), dirname(realpathSync(here))]) if (real === root || real.startsWith(root + '/')) fail(`${HOME} is inside the public repository folder. Refusing to run.`);
  if (git(['ls-files', '--', '_private', 'vault', 'passwords.json'])) fail('This public repository tracks private sources (_private/, vault/ or passwords.json). Remove them first.');
  if (git(['ls-files', '--', 'passwords.json'], HOME)) fail('passwords.json is tracked by git in the private repo. Run: git rm --cached passwords.json');
  if (tryGit(['check-ignore', '-q', 'passwords.json'], HOME) === null) fail(`passwords.json is not git-ignored in ${HOME}. Refusing to run.`);
}

function loadPasswords() {
  if (!existsSync(PASSWORDS)) fail(`Missing ${PASSWORDS}. Create it as {"<page>": "<password>"}; the sources go in ${VAULT}/<page>/index.html.`);
  let all;
  try { all = JSON.parse(readFileSync(PASSWORDS, 'utf8')); } catch (e) { fail(`${PASSWORDS} is not valid JSON: ${e.message}`); }
  for (const [page, pw] of Object.entries(all)) {
    if (!PAGE_RE.test(page)) fail(`Bad page name "${page}" in ${PASSWORDS} (use lowercase letters, digits, "-", "/").`);
    if (typeof pw !== 'string' || !pw) fail(`Password for "${page}" must be a non-empty string.`);
  }
  const names = Object.keys(all);
  for (const a of names) for (const b of names) if (b.startsWith(a + '/')) fail(`Page "${b}" sits inside page "${a}". Pick separate folders.`);
  return all;
}

function walk(dir, base = '') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.name.startsWith('.')) continue;                       // .DS_Store and friends
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(join(dir, e.name), rel));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

function readGate(page) {
  const file = abs(page, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  if (!html.includes(MARKER)) return null;
  const m = html.match(DATA_RE);
  if (!m) return null;
  try { return { html, cfg: JSON.parse(m[1]) }; } catch { return null; }
}

function gateHtml(cfg) {
  const data = JSON.stringify(cfg).replace(/</g, '\\u003c');
  const runtime = read('tools', 'protect-runtime.js').toString('utf8').trimEnd();
  return read('tools', 'protect-gate.html').toString('utf8')
    .replace('__VAULT_RUNTIME__', () => runtime)
    .replace('__VAULT_DATA__', () => data);
}

/* ---------- build ---------- */
function build(page, password) {
  const src = join(VAULT, page), out = abs(page);
  if (!existsSync(join(src, 'index.html'))) fail(`Missing ${VAULT}/${page}/index.html`);
  const names = walk(src);

  const old = readGate(page);
  if (existsSync(out) && !old) fail(`/${page}/ already exists and was not made by this tool. Pick another page name.`);

  /* Keep the salt (so "remember me" survives rebuilds) unless the password changed. */
  let salt = randomBytes(16), key = null, oldMain = null;
  if (old && old.cfg.page === page && old.cfg.iter === ITER) {
    const k = kdf(password, Buffer.from(old.cfg.salt, 'base64'));
    oldMain = open(k, Buffer.from(old.cfg.main, 'base64'), page, 'index');
    if (oldMain) { salt = Buffer.from(old.cfg.salt, 'base64'); key = k; }
  }
  const rekeyed = !key;
  key ??= kdf(password, salt);

  mkdirSync(out, { recursive: true });
  const files = {}, wanted = new Set(['index.html']), changed = [];
  for (const name of names) {
    if (name === 'index.html') continue;
    const bytes = readFileSync(join(src, name));
    if (bytes.length > MAX_BYTES) fail(`${page}/${name} is over 100 MB; GitHub will not accept it.`);
    if (bytes.length > WARN_BYTES) console.warn(`  ! ${name} is ${(bytes.length / 1048576).toFixed(0)} MB; it is downloaded and decrypted in one piece.`);
    const id = createHmac('sha256', key).update(`name|${name}`).digest('hex').slice(0, 16);
    const file = join(out, `${id}.enc`);
    let blob = existsSync(file) ? readFileSync(file) : null;
    if (!blob || !open(key, blob, page, `file|${name}`)?.equals(bytes)) {      // unchanged files keep their bytes
      blob = seal(key, bytes, page, `file|${name}`);
      writeFileSync(file, blob);
      changed.push(name);
    }
    wanted.add(`${id}.enc`);
    files[name] = { id, type: MIME[name.split('.').pop().toLowerCase()] || 'application/octet-stream', size: bytes.length, v: sha(blob).slice(0, 8) };
  }

  const main = Buffer.from(JSON.stringify({ html: readFileSync(join(src, 'index.html'), 'utf8'), files }));
  const sameMain = oldMain?.equals(main);
  if (!sameMain) changed.push('index.html');
  const cfg = { v: 1, page, kdf: 'PBKDF2-SHA256', iter: ITER, salt: salt.toString('base64'), main: sameMain ? old.cfg.main : seal(key, main, page, 'index').toString('base64') };
  const html = gateHtml(cfg);
  if (!old || old.html !== html) writeFileSync(join(out, 'index.html'), html);

  for (const f of readdirSync(out)) {
    if (wanted.has(f)) continue;
    if (f.endsWith('.enc')) { rmSync(join(out, f)); changed.push(`(removed ${f})`); }
    else console.warn(`  ! /${page}/${f} is not managed by this tool and is served as-is (unencrypted).`);
  }

  const words = password.trim().split(/\s+|[-_.]/).filter(Boolean).length;
  console.log(`built  /${page}/  ${names.length} file(s)` + (rekeyed ? (old ? ', new password (remembered devices are logged out)' : ', new page') : '') + (changed.length ? `, updated: ${changed.join(', ')}` : ', no content change'));
  if (password.length < 20 && words < 4) console.warn(`  ! weak password for /${page}/: the ciphertext is public and can be brute-forced offline. Use 4+ random words for anything real.`);
}

/* ---------- verify: independent round trip with WebCrypto, the same API the browser uses ---------- */
const subtle = webcrypto.subtle;
async function wcKey(password, cfg) {
  const km = await subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(cfg.salt, 'base64'), iterations: cfg.iter }, km, 256);
  return subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']);
}
async function wcOpen(key, blob, page, label) {
  try { return Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: blob.subarray(0, 12), additionalData: aad(page, label) }, key, blob.subarray(12))); }
  catch { return null; }
}

/* Decrypts a built page. Returns { html, files: Map<name, Buffer> }. */
async function decryptPage(page, password) {
  const gate = readGate(page) ?? fail(`/${page}/index.html is missing or was not built by this tool.`);
  const { cfg } = gate;
  const key = await wcKey(password, cfg);
  const mainBytes = await wcOpen(key, Buffer.from(cfg.main, 'base64'), page, 'index');
  if (!mainBytes) fail(`/${page}/: the password does not decrypt the page.`);
  const main = JSON.parse(mainBytes.toString('utf8'));
  const files = new Map();
  for (const [name, f] of Object.entries(main.files)) {
    const file = abs(page, `${f.id}.enc`);
    if (!existsSync(file)) fail(`/${page}/: ${f.id}.enc (for "${name}") is missing.`);
    const blob = readFileSync(file);
    const bytes = await wcOpen(key, blob, page, `file|${name}`);
    if (!bytes) fail(`/${page}/: "${name}" does not decrypt.`);
    if (bytes.length !== f.size || sha(blob).slice(0, 8) !== f.v) fail(`/${page}/: "${name}" does not match its manifest entry.`);
    files.set(name, bytes);
  }
  return { gate, key, main, files };
}

async function verify(page, password) {
  const checks = [];
  const ok = (label) => checks.push(label);
  const { gate, main, files } = await decryptPage(page, password);
  const { cfg, html: gateText } = gate;
  ok('right password decrypts');

  if (cfg.iter < ITER || cfg.kdf !== 'PBKDF2-SHA256' || Buffer.from(cfg.salt, 'base64').length < 16) fail(`/${page}/: weak KDF parameters.`);
  if (!/<meta name="robots" content="noindex/.test(gateText)) fail(`/${page}/: gate page is missing noindex.`);
  if (gateText.includes('__VAULT_')) fail(`/${page}/: gate template placeholder left unfilled.`);

  /* Wrong passwords and tampered data must fail (GCM authenticates). */
  for (const wrong of [password + 'x', password.slice(0, -1), password.toUpperCase(), 'wrong', ' ' + password].filter((w) => w && w !== password)) {
    if (await wcOpen(await wcKey(wrong, cfg), Buffer.from(cfg.main, 'base64'), page, 'index')) fail(`/${page}/: decrypted with the WRONG password "${wrong}".`);
  }
  ok('wrong passwords fail');
  const key = await wcKey(password, cfg);
  const bent = Buffer.from(cfg.main, 'base64'); bent[bent.length >> 1] ^= 1;
  if (await wcOpen(key, bent, page, 'index')) fail(`/${page}/: tampered ciphertext was accepted.`);
  if (await wcOpen(key, Buffer.from(cfg.main, 'base64'), page, 'file|index.html')) fail(`/${page}/: ciphertext accepted under the wrong label.`);
  ok('tampered data fails');

  /* Decrypted output equals the sources, byte for byte. */
  const src = join(VAULT, page);
  const haveSrc = existsSync(join(src, 'index.html'));
  const sources = new Map();
  if (haveSrc) {
    for (const name of walk(src)) sources.set(name, readFileSync(join(src, name)));
    if (main.html !== sources.get('index.html').toString('utf8')) fail(`/${page}/: decrypted index.html differs from the source. Rebuild.`);
    const want = [...sources.keys()].filter((n) => n !== 'index.html').sort(), got = [...files.keys()].sort();
    if (want.join('\n') !== got.join('\n')) fail(`/${page}/: file list differs from the source. Rebuild.`);
    for (const n of want) if (!files.get(n).equals(sources.get(n))) fail(`/${page}/: "${n}" differs from the source. Rebuild.`);
    ok(`matches source (${sources.size} file(s))`);
  } else {
    sources.set('index.html', Buffer.from(main.html));
    for (const [n, b] of files) sources.set(n, b);
  }

  /* No plaintext in what gets published. The gate page must be exactly template + runtime + data,
     so only the data blob and the .enc files can carry content; probe them with 24-byte windows
     taken from every source file. */
  if (gateText !== gateHtml(cfg)) fail(`/${page}/index.html is not the current gate template. Rebuild.`);
  const outFiles = readdirSync(abs(page)).map((f) => [f, f === 'index.html' ? Buffer.from(cfg.main) : read(page, f)]);
  let probes = 0;
  for (const [name, bytes] of sources) {
    const step = Math.max(1, Math.floor(bytes.length / 400));
    for (let i = 0; i + 24 <= bytes.length; i += step) {
      const probe = bytes.subarray(i, i + 24);
      if (new Set(probe).size < 6) continue;
      probes++;
      for (const [f, data] of outFiles) if (data.includes(probe)) fail(`/${page}/${f} contains plaintext from "${name}": ${JSON.stringify(probe.toString('latin1'))}`);
    }
  }
  if (outFiles.some(([, d]) => d.includes(Buffer.from(password)))) fail(`/${page}/: the password itself appears in the output.`);
  const extra = outFiles.map(([f]) => f).filter((f) => f !== 'index.html' && !Object.values(main.files).some((m) => `${m.id}.enc` === f));
  if (extra.length) fail(`/${page}/ has files the page does not use: ${extra.join(', ')}`);
  ok(`no plaintext in output (${probes} probes × ${outFiles.length} file(s))`);

  console.log(`verify /${page}/  ok: ${checks.join('; ')}`);
}

/* ---------- restore: the published ciphertext doubles as a backup of the sources ---------- */
async function restore(page, password, force) {
  const dest = join(VAULT, page);
  if (existsSync(dest) && readdirSync(dest).length && !force) fail(`${dest}/ is not empty. Add --force to overwrite.`);
  const { main, files } = await decryptPage(page, password);
  const put = (name, bytes) => { const f = join(dest, name); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, bytes); };
  put('index.html', main.html);
  for (const [name, bytes] of files) {
    if (name.split('/').some((s) => !s || s === '..' || s.startsWith('.'))) fail(`Refusing odd file name "${name}".`);
    put(name, bytes);
  }
  console.log(`restored ${dest}/  (${files.size + 1} file(s))`);
}

/* ---------- cli ---------- */
async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const pages = args.filter((a) => !a.startsWith('--')).map((p) => p.replace(/^\/+|\/+$/g, ''));
  for (const f of flags) if (!['--verify', '--restore', '--force', '--help'].includes(f)) fail(`Unknown option ${f}`);
  if (flags.has('--help')) return console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\* ?/, ''));
  for (const p of pages) if (!PAGE_RE.test(p)) fail(`Bad page name "${p}".`);

  assertPrivate();

  if (flags.has('--restore')) {
    if (pages.length !== 1) fail('Usage: node tools/protect.mjs --restore <page> [--force]');
    let pw = existsSync(PASSWORDS) ? loadPasswords()[pages[0]] : undefined;
    pw ??= process.env.VAULT_PASSWORD;
    if (!pw) {
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      pw = await rl.question(`Password for /${pages[0]}/: `);
      rl.close();
    }
    return restore(pages[0], pw, flags.has('--force'));
  }

  const passwords = loadPasswords();
  const todo = pages.length ? pages : Object.keys(passwords);
  if (!todo.length) fail(`${PASSWORDS} lists no pages.`);
  for (const p of todo) if (!passwords[p]) fail(`No password for "${p}" in ${PASSWORDS}.`);
  if (!flags.has('--verify')) for (const p of todo) build(p, passwords[p]);
  for (const p of todo) await verify(p, passwords[p]);
  if (!flags.has('--verify')) console.log(`\nNext: git add ${todo.map((p) => p + '/').join(' ')} && git commit && git push   (push = live)`);
}

main().catch((e) => {
  console.error(e instanceof Fail ? `protect: ${e.message}` : e);
  process.exit(1);
});

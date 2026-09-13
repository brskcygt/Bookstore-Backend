#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PROJECT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}\.tar\.gz$/;
const SHA256 = /^[a-f0-9]{64}$/;
const COMPONENT = /^[a-z][a-z0-9-]{0,31}$/;
const OS_VALUES = new Set(['win-x64', 'linux-x64', 'any']);

function parseArgs(argv) {
  const options = { allowHttp: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--allow-http') {
      options.allowHttp = true;
      continue;
    }
    const key = { '--project-id': 'projectId', '--version': 'version', '--manifest': 'manifestPath', '--base-url': 'baseUrl' }[arg];
    if (!key) throw new Error(`Unknown argument: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function normalizeBaseUrl(value, allowHttp = false) {
  let url;
  try { url = new URL(value); } catch { throw new Error('IDP URL must be an absolute http(s) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('IDP URL must be an http(s) origin/path without credentials, query or fragment.');
  }
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp && !allowHttp) {
    throw new Error('Plain HTTP requires --allow-http on a trusted private network.');
  }
  return url.toString().replace(/\/$/, '');
}

async function hashFile(filePath) {
  const stat = await fs.promises.lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0) throw new Error(`Invalid artifact: ${filePath}`);
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return { size: stat.size, sha256: hash.digest('hex') };
}

function validateManifest(manifest, version) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Manifest must be an object.');
  if (manifest.schema !== 1 || manifest.version !== version || !PROJECT.test(manifest.project || '')) {
    throw new Error('Manifest header is invalid.');
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length < 1 || manifest.artifacts.length > 40) {
    throw new Error('Manifest must contain between 1 and 40 artifacts.');
  }
  const names = new Set();
  const pairs = new Set();
  for (const artifact of manifest.artifacts) {
    if (!COMPONENT.test(artifact.component || '') || !OS_VALUES.has(artifact.os)) throw new Error('Invalid artifact component.');
    if (!FILE_NAME.test(artifact.file || '') || path.basename(artifact.file) !== artifact.file) throw new Error('Invalid artifact file.');
    if (!SHA256.test(artifact.sha256 || '') || !Number.isSafeInteger(artifact.size) || artifact.size <= 0) {
      throw new Error(`Invalid digest or size for ${artifact.file}.`);
    }
    const pair = `${artifact.component}/${artifact.os}`;
    if (names.has(artifact.file) || pairs.has(pair)) throw new Error('Duplicate artifact entry.');
    names.add(artifact.file);
    pairs.add(pair);
  }
}

async function responseError(response, token) {
  let detail = '';
  try { detail = (await response.text()).slice(0, 2048).replace(/\s+/g, ' ').trim(); } catch {}
  return `${response.status} ${response.statusText || ''}${detail ? `: ${detail}` : ''}`.replaceAll(token, '[REDACTED]').trim();
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (!options.projectId || /[\x00-\x20/\\]/.test(options.projectId)) throw new Error('Invalid --project-id.');
  if (!VERSION.test(options.version || '')) throw new Error('Invalid --version.');
  if (!options.manifestPath) throw new Error('--manifest is required.');
  const token = env.IDP_ARTIFACT_UPLOAD_TOKEN;
  if (typeof token !== 'string' || token.length < 32 || /\s/.test(token)) throw new Error('Upload token is missing or invalid.');
  const baseUrl = normalizeBaseUrl(options.baseUrl || env.IDP_URL, options.allowHttp);
  const absoluteManifest = path.resolve(options.manifestPath);
  const manifest = JSON.parse(await fs.promises.readFile(absoluteManifest, 'utf8'));
  validateManifest(manifest, options.version);
  const directory = path.dirname(absoluteManifest);
  const releasePath = `${encodeURIComponent(options.projectId)}/${encodeURIComponent(options.version)}`;

  for (const artifact of manifest.artifacts) {
    const filePath = path.join(directory, artifact.file);
    const actual = await hashFile(filePath);
    if (actual.size !== artifact.size || actual.sha256 !== artifact.sha256) throw new Error(`Artifact mismatch: ${artifact.file}`);
    const response = await fetch(`${baseUrl}/api/artifact-uploads/${releasePath}/${encodeURIComponent(artifact.file)}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/gzip',
        'content-length': String(artifact.size),
        'x-artifact-sha256': artifact.sha256,
      },
      body: fs.createReadStream(filePath),
      duplex: 'half',
      redirect: 'error',
      signal: AbortSignal.timeout(1_800_000),
    });
    if (!response.ok) throw new Error(`Upload failed for ${artifact.file}: ${await responseError(response, token)}`);
    process.stdout.write(`uploaded ${artifact.file}\n`);
  }

  const response = await fetch(`${baseUrl}/api/artifact-uploads/${releasePath}/finalize`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(manifest),
    redirect: 'error',
    signal: AbortSignal.timeout(1_800_000),
  });
  if (!response.ok) throw new Error(`Finalize failed: ${await responseError(response, token)}`);
  process.stdout.write(`finalized ${manifest.project}@${manifest.version}\n`);
}

main().catch((err) => {
  process.stderr.write(`upload-artifacts: ${err.message}\n`);
  process.exitCode = 1;
});

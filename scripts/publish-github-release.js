#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ASSET = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}(?:\.tar\.gz|\.json)$/;

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = { '--version': 'version', '--directory': 'directory' }[argv[index]];
    if (!key || !argv[index + 1]) throw new Error('Usage: publish-github-release.js --version <version> --directory <directory>');
    result[key] = argv[index + 1];
  }
  return result;
}

async function apiError(response, token) {
  let detail = '';
  try { detail = (await response.text()).slice(0, 2048).replace(/\s+/g, ' ').trim(); } catch {}
  return `${response.status} ${response.statusText || ''}${detail ? `: ${detail}` : ''}`
    .replaceAll(token, '[REDACTED]')
    .trim();
}

async function requestJson(fetchImpl, url, options, token) {
  const response = await fetchImpl(url, options);
  if (!response.ok) throw new Error(await apiError(response, token));
  return response.json();
}

async function publishRelease({ token, repository, sha, version, directory, fetchImpl = fetch }) {
  if (typeof token !== 'string' || token.length < 20 || /\s/.test(token)) throw new Error('GITHUB_RELEASE_TOKEN is missing or invalid.');
  if (!REPOSITORY.test(repository || '')) throw new Error('GITHUB_REPOSITORY is missing or invalid.');
  if (!VERSION.test(version || '')) throw new Error('Release version is invalid.');
  if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/i.test(sha)) throw new Error('GITHUB_SHA is missing or invalid.');

  const absoluteDirectory = path.resolve(directory || '');
  const entries = await fs.promises.readdir(absoluteDirectory, { withFileTypes: true });
  const manifestNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(`-${version}-manifest.json`))
    .map((entry) => entry.name);
  if (manifestNames.length !== 1) throw new Error(`Expected exactly one manifest for ${version}.`);
  const manifestName = manifestNames[0];
  const manifest = JSON.parse(await fs.promises.readFile(path.join(absoluteDirectory, manifestName), 'utf8'));
  if (manifest.version !== version || !Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    throw new Error('Release manifest is invalid.');
  }
  const expectedNames = new Set([manifestName, ...manifest.artifacts.map((artifact) => artifact.file)]);
  const assets = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!expectedNames.has(entry.name)) continue;
    if (!ASSET.test(entry.name)) throw new Error(`Invalid release asset name: ${entry.name}`);
    const filePath = path.join(absoluteDirectory, entry.name);
    const stat = await fs.promises.lstat(filePath);
    if (!entry.isFile() || stat.isSymbolicLink() || stat.size <= 0) throw new Error(`Invalid release asset: ${entry.name}`);
    assets.push({ name: entry.name, filePath, size: stat.size });
  }
  if (assets.length !== expectedNames.size) throw new Error('A manifest artifact is missing from the release directory.');

  const [owner, repo] = repository.split('/').map(encodeURIComponent);
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'bookstore-idp-release',
    'x-github-api-version': '2026-03-10',
  };
  const tag = `v${version}`;
  let release;
  const create = await fetchImpl(`${apiBase}/releases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: sha,
      name: tag,
      body: `IDP artifact mirror for ${version}.`,
      draft: false,
      prerelease: /(?:^|[.-])(?:test|alpha|beta|rc)(?:[.-]|$)/i.test(version),
      make_latest: 'legacy',
    }),
  });
  if (create.ok) {
    release = await create.json();
  } else if (create.status === 422) {
    release = await requestJson(fetchImpl, `${apiBase}/releases/tags/${encodeURIComponent(tag)}`, { headers }, token);
  } else {
    throw new Error(`Create GitHub Release failed: ${await apiError(create, token)}`);
  }

  const existing = new Set((release.assets || []).map((asset) => asset.name));
  const uploadBase = String(release.upload_url || '').split('{')[0];
  if (!uploadBase.startsWith('https://uploads.github.com/')) throw new Error('GitHub returned an invalid release upload URL.');

  for (const asset of assets) {
    if (existing.has(asset.name)) {
      process.stdout.write(`GitHub Release already contains ${asset.name}; skipped\n`);
      continue;
    }
    const response = await fetchImpl(`${uploadBase}?name=${encodeURIComponent(asset.name)}`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': asset.name.endsWith('.json') ? 'application/json' : 'application/gzip',
        'content-length': String(asset.size),
        'user-agent': 'bookstore-idp-release',
        'x-github-api-version': '2026-03-10',
      },
      body: fs.createReadStream(asset.filePath),
      duplex: 'half',
      redirect: 'error',
      signal: AbortSignal.timeout(1_800_000),
    });
    if (!response.ok) throw new Error(`GitHub asset upload failed for ${asset.name}: ${await apiError(response, token)}`);
    process.stdout.write(`published ${asset.name}\n`);
  }
  process.stdout.write(`GitHub Release ready: ${release.html_url}\n`);
  return release;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  return publishRelease({
    ...options,
    token: env.GITHUB_RELEASE_TOKEN,
    repository: env.GITHUB_REPOSITORY,
    sha: env.GITHUB_SHA,
  });
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`publish-github-release: ${err.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, publishRelease, main };

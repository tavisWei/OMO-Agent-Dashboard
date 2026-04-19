import { statSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import chokidar, { type FSWatcher } from 'chokidar';
import { getConfigPaths } from './config-manager.js';
import { getDbPath } from '../utils/paths.js';

const events = new EventEmitter();
let watcher: FSWatcher | null = null;
let pollingTimer: NodeJS.Timeout | null = null;
let lastWalSignature = '';

function getWalPath(): string {
  const basePath = process.env.OPENCODE_DB_PATH || getDbPath();
  return `${basePath}-wal`;
}

function getSignature(filePath: string): string {
  try {
    const stats = statSync(filePath);
    return `${stats.mtimeMs}:${stats.size}`;
  } catch {
    return 'missing';
  }
}

function emitDbChanged(): void {
  events.emit('db-changed');
}

function emitConfigChanged(): void {
  events.emit('config-changed');
}

export function startWatching(): void {
  if (watcher) {
    return;
  }

  const walPath = getWalPath();
  const { openAgentPath, opencodePath, omoPath } = getConfigPaths();
  lastWalSignature = getSignature(walPath);

  watcher = chokidar.watch([walPath, openAgentPath, opencodePath, omoPath], {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  watcher.on('add', (filePath) => {
    if (filePath === walPath) {
      emitDbChanged();
      return;
    }
    emitConfigChanged();
  });

  watcher.on('change', (filePath) => {
    if (filePath === walPath) {
      emitDbChanged();
      return;
    }
    emitConfigChanged();
  });

  pollingTimer = setInterval(() => {
    const nextSignature = getSignature(walPath);
    if (nextSignature !== lastWalSignature) {
      lastWalSignature = nextSignature;
      emitDbChanged();
    }
  }, 3000);
}

export function stopWatching(): void {
  watcher?.close().catch(() => undefined);
  watcher = null;
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

export function onDbChange(callback: () => void): () => void {
  events.on('db-changed', callback);
  return () => events.off('db-changed', callback);
}

export function onConfigChange(callback: () => void): () => void {
  events.on('config-changed', callback);
  return () => events.off('config-changed', callback);
}

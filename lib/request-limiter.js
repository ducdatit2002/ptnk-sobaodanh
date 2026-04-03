const DEFAULT_MAX_CONCURRENT = 300;
const DEFAULT_MAX_QUEUE = 2000;
const DEFAULT_QUEUE_TIMEOUT_MS = 15_000;

let activeCount = 0;
const waitQueue = [];

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getLimiterConfig() {
  return {
    maxConcurrent: parsePositiveInt(
      process.env.LOOKUP_MAX_CONCURRENT,
      DEFAULT_MAX_CONCURRENT,
    ),
    maxQueue: parsePositiveInt(process.env.LOOKUP_MAX_QUEUE, DEFAULT_MAX_QUEUE),
    queueTimeoutMs: parsePositiveInt(
      process.env.LOOKUP_QUEUE_TIMEOUT_MS,
      DEFAULT_QUEUE_TIMEOUT_MS,
    ),
  };
}

function grantNextSlot() {
  while (waitQueue.length > 0) {
    const entry = waitQueue.shift();

    if (!entry || entry.settled) {
      continue;
    }

    entry.settled = true;
    clearTimeout(entry.timeoutId);
    activeCount += 1;
    entry.resolve(createRelease());
    return;
  }
}

function createRelease() {
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    activeCount = Math.max(0, activeCount - 1);
    grantNextSlot();
  };
}

export class QueueFullError extends Error {
  constructor(message = 'He thong dang qua tai. Vui long thu lai sau it giay.') {
    super(message);
    this.name = 'QueueFullError';
    this.code = 'QUEUE_FULL';
  }
}

export class QueueTimeoutError extends Error {
  constructor(message = 'He thong dang dong. Vui long thu lai sau it giay.') {
    super(message);
    this.name = 'QueueTimeoutError';
    this.code = 'QUEUE_TIMEOUT';
  }
}

export function getLookupLimiterStats() {
  const config = getLimiterConfig();

  return {
    activeCount,
    queuedCount: waitQueue.filter((entry) => !entry.settled).length,
    maxConcurrent: config.maxConcurrent,
    maxQueue: config.maxQueue,
    queueTimeoutMs: config.queueTimeoutMs,
  };
}

async function acquireSlot() {
  const config = getLimiterConfig();

  if (activeCount < config.maxConcurrent) {
    activeCount += 1;
    return createRelease();
  }

  const queuedCount = waitQueue.filter((entry) => !entry.settled).length;

  if (queuedCount >= config.maxQueue) {
    throw new QueueFullError();
  }

  return new Promise((resolve, reject) => {
    const entry = {
      resolve,
      reject,
      settled: false,
      timeoutId: null,
    };

    entry.timeoutId = setTimeout(() => {
      if (entry.settled) {
        return;
      }

      entry.settled = true;
      const index = waitQueue.indexOf(entry);

      if (index !== -1) {
        waitQueue.splice(index, 1);
      }

      reject(new QueueTimeoutError());
    }, config.queueTimeoutMs);

    waitQueue.push(entry);
  });
}

export async function withLookupCapacity(task) {
  const release = await acquireSlot();

  try {
    return await task();
  } finally {
    release();
  }
}

type ContactRelayFields = {
  name: string;
  email: string;
  message: string;
  submission_reference: string;
};

export type ContactRelayState = 'accepted_client' | 'failed' | 'unconfirmed';

function cancellationScope(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  const timer = setTimeout(
    () => controller.abort(new Error('Délai dépassé')),
    timeoutMs,
  );
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    close() {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abort);
    },
  };
}

async function timedJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parent?: AbortSignal,
) {
  const scope = cancellationScope(parent, timeoutMs);
  try {
    scope.signal.throwIfAborted();
    const response = await fetch(url, { ...init, signal: scope.signal });
    const body: unknown = await response.json().catch(() => null);
    scope.signal.throwIfAborted();
    return { response, body };
  } finally {
    scope.close();
  }
}

function solveChallenge(
  worker: Worker,
  challenge: { challenge: string; timestamp: number; difficulty: number },
  parent?: AbortSignal,
): Promise<string> {
  const scope = cancellationScope(parent, 35000);
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (nonce?: string) => {
      if (settled) return;
      settled = true;
      scope.signal.removeEventListener('abort', abort);
      scope.close();
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      if (nonce === undefined) reject(new Error('Vérification interrompue'));
      else resolve(nonce);
    };
    const abort = () => finish();
    if (scope.signal.aborted) {
      finish();
      return;
    }
    scope.signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<unknown>) => {
      const value = data as { nonce?: unknown } | null;
      finish(
        typeof value?.nonce === 'string' && /^\d+$/.test(value.nonce)
          ? value.nonce
          : undefined,
      );
    };
    worker.onerror = () => finish();
    try {
      worker.postMessage(challenge);
    } catch {
      finish();
    }
  });
}

export async function relayContact(
  fields: ContactRelayFields,
  signal?: AbortSignal,
): Promise<ContactRelayState> {
  let posted = false;
  let worker: Worker | undefined;
  try {
    signal?.throwIfAborted();
    const initial = await timedJson(
      'https://inlett.vercel.app/api/challenge',
      { cache: 'no-store', credentials: 'omit' },
      10000,
      signal,
    );
    if (!initial.response.ok) return 'failed';
    const challenge = initial.body as {
      challenge?: unknown;
      timestamp?: unknown;
      difficulty?: unknown;
    } | null;
    if (
      typeof challenge?.challenge !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(challenge.challenge) ||
      typeof challenge.timestamp !== 'number' ||
      !Number.isSafeInteger(challenge.timestamp) ||
      typeof challenge.difficulty !== 'number' ||
      !Number.isInteger(challenge.difficulty) ||
      challenge.difficulty < 1 ||
      challenge.difficulty > 5
    )
      return 'failed';
    signal?.throwIfAborted();
    worker = new Worker('/inlett-pow.js');
    const nonce = await solveChallenge(
      worker,
      {
        challenge: challenge.challenge,
        timestamp: challenge.timestamp,
        difficulty: challenge.difficulty,
      },
      signal,
    );
    signal?.throwIfAborted();
    // Any interruption after this point is ambiguous; never automatically retry.
    posted = true;
    const submission = await timedJson(
      'https://inlett.vercel.app/api/submit/ede03bbe-6591-4e33-a351-1ffe4f050895',
      {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          _lang: 'fr',
          _gotcha: '',
          pow_challenge: challenge.challenge,
          pow_timestamp: challenge.timestamp,
          pow_nonce: nonce,
        }),
      },
      15000,
      signal,
    );
    const body = submission.body as { success?: unknown } | null;
    if (submission.response.ok && body?.success === true)
      return 'accepted_client';
    return submission.response.status >= 500 ||
      submission.response.status === 408 ||
      (submission.response.ok && body?.success !== false)
      ? 'unconfirmed'
      : 'failed';
  } catch {
    return posted ? 'unconfirmed' : 'failed';
  } finally {
    worker?.terminate();
  }
}

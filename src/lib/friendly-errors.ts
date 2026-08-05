/**
 * Server errors → sentences a shop owner can act on.
 *
 * The API layer speaks in developer strings ("Unauthorized.", "Update failed.",
 * raw OAuth codes). None of that should ever reach a screen. Every fetch in the
 * app funnels through here so there is exactly one place that decides what a
 * failure looks like to a non-technical user.
 *
 * Rules for the copy:
 *   - Plain sentence, no codes, no jargon, no blame.
 *   - Say what to do next when there is something to do.
 *   - Never leak an internal identifier, endpoint, or environment variable.
 */

export type FriendlyError = {
  /** Sentence shown to the user. */
  message: string;
  /** Label for the recovery button, when retrying makes sense. */
  action?: string;
  /** True when the user should be sent back to sign in. */
  signOut?: boolean;
};

const GENERIC: FriendlyError = {
  message: "Something went wrong on our side. Please try again.",
  action: "Try again",
};

/**
 * Matched in order — first hit wins, so put specific phrases above general
 * ones. Keys are matched case-insensitively against the raw server string.
 */
const BY_PHRASE: Array<[RegExp, FriendlyError]> = [
  [
    /invalid credentials|email and password required/i,
    {
      message:
        "That email or password doesn't match. Please check and try again.",
    },
  ],
  [
    /expired|token.*invalid|invalid.*token/i,
    {
      message: "Your Facebook permission has expired.",
      action: "Reconnect",
    },
  ],
  [
    /oauth|invalid signature|verification failed|meta_verify_token/i,
    {
      message: "We couldn't connect your Facebook page. Please try again.",
      action: "Try again",
    },
  ],
  [
    /webhook|graph|facebook|meta_/i,
    {
      message:
        "We're having trouble reaching Facebook. Please try again in a few minutes.",
      action: "Try again",
    },
  ],
  [
    /no products parsed|send json array or csv/i,
    {
      message:
        "We couldn't read that file. Try uploading an Excel or CSV file instead.",
    },
  ],
  [
    /file required/i,
    { message: "Please choose a file first." },
  ],
  [
    /text required|provide text/i,
    { message: "Please write a message first." },
  ],
  [
    /only admin\/manager|forbidden/i,
    {
      message:
        "You don't have permission to do this. Ask your shop owner to help.",
    },
  ],
  [
    /not found/i,
    { message: "We couldn't find that. It may have been deleted." },
  ],
];

const BY_STATUS: Record<number, FriendlyError> = {
  400: { message: "Something in that form isn't quite right. Please check it." },
  401: {
    message: "You've been signed out. Please sign in again.",
    action: "Sign in",
    signOut: true,
  },
  403: {
    message:
      "You don't have permission to do this. Ask your shop owner to help.",
  },
  404: { message: "We couldn't find that. It may have been deleted." },
  408: {
    message: "That took too long. Please check your internet and try again.",
    action: "Try again",
  },
  429: {
    message: "That's a lot at once! Please wait a moment and try again.",
    action: "Try again",
  },
};

/**
 * Turn an HTTP status and/or a raw server message into user-facing copy.
 * Phrase matching runs first so a specific 500 ("Webhook failed") beats the
 * generic 500 wording.
 */
export function toFriendlyError(
  status?: number,
  raw?: string | null,
): FriendlyError {
  if (raw) {
    for (const [pattern, friendly] of BY_PHRASE) {
      if (pattern.test(raw)) return friendly;
    }
  }
  if (status && BY_STATUS[status]) return BY_STATUS[status];
  if (status === 0) {
    return {
      message:
        "You seem to be offline. Please check your internet and try again.",
      action: "Try again",
    };
  }
  return GENERIC;
}

/**
 * Wrapper around fetch that resolves to either data or friendly copy, so
 * callers never touch response.ok or a raw error string.
 *
 * A thrown fetch (DNS failure, aeroplane mode, dev server down) is reported as
 * offline rather than as a crash — on the connections this audience uses, that
 * is nearly always what it means.
 */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: FriendlyError }> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return { ok: false, error: toFriendlyError(0) };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON body is itself a server problem; fall through to status.
  }

  if (!response.ok) {
    const raw =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null;
    return { ok: false, error: toFriendlyError(response.status, raw) };
  }

  return { ok: true, data: payload as T };
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1";

function encryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is required to encrypt secrets at rest.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 4 && parts[0] === PREFIX;
}

/** AES-256-GCM. Format: v1.<iv>.<tag>.<ciphertext> (all base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * Decrypts ciphertext produced by encryptSecret. Legacy plaintext rows are
 * returned unchanged so enabling encryption does not break existing Pages.
 * Tampered ciphertext returns undefined rather than a corrupt token.
 */
export function decryptSecret(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!isEncrypted(value)) return value;
  const parts = value.split(".");
  if (parts.length !== 4) return undefined;
  try {
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const ciphertext = Buffer.from(parts[3], "base64");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decoded.toString("utf8");
  } catch {
    return undefined;
  }
}

export function encryptSecretIfConfigured(plaintext: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY?.trim()) return plaintext;
  return encryptSecret(plaintext);
}

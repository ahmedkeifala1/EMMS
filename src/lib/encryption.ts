import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const MASTER_KEY = Buffer.from(
  process.env.ENCRYPTION_MASTER_KEY || "a".repeat(64),
  "hex"
);

export function encrypt(text: string, memoId: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(memoId);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(encryptedText: string, memoId: string): string {
  const data = Buffer.from(encryptedText, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.subarray(IV_LENGTH + 16);
  const key = deriveKey(memoId);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

function deriveKey(memoId: string): Buffer {
  return crypto
    .createHmac("sha256", MASTER_KEY)
    .update(memoId)
    .digest()
    .subarray(0, 32);
}

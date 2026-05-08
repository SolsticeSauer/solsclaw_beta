import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface StagedScript {
  /** Absolute path to the downloaded file. */
  path: string;
  /** Hex SHA-256 of the downloaded bytes. Logged for transparency / audit. */
  sha256: string;
  /** Size in bytes. */
  size: number;
}

/**
 * Download a remote shell script to a temp file and return its hash so the
 * caller can log it before execution. We deliberately do NOT pipe straight
 * into a shell — staging gives auditability and lets the user inspect.
 *
 * If `expectedSha256` is provided, throws on mismatch.
 */
export async function stageScript(url: string, expectedSha256?: string): Promise<StagedScript> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

  if (expectedSha256 && expectedSha256.toLowerCase() !== sha256) {
    throw new Error(`Checksum mismatch for ${url}: expected ${expectedSha256}, got ${sha256}`);
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaw-installer-'));
  const file = path.join(dir, path.basename(new URL(url).pathname) || 'script.sh');
  await fs.writeFile(file, buf, { mode: 0o700 });
  return { path: file, sha256, size: buf.length };
}

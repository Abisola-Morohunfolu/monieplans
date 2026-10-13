import { HTTPException } from 'hono/http-exception';
import type { Env } from '../index';
import { statement } from './ledger';
import { workersAI } from './ai';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export interface CaptureJob {
  id: string;
  generation: number;
}
export interface CaptureRow {
  id: string;
  user_id: string;
  object_key: string;
  sha256: string;
  mime_type: string;
  status: string;
  generation: number;
  attempt: number;
  default_category_id: string | null;
  opened_month: string | null;
  extracted_json: string | null;
  error: string | null;
  transaction_id: string | null;
  created_at: string;
}
export function validateImage(bytes: Uint8Array, mime: string) {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES)
    throw new HTTPException(400, { message: 'Choose an image up to 10MB.' });
  const png =
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP';
  if (
    !IMAGE_TYPES.includes(mime) ||
    !(mime === 'image/png' ? png : mime === 'image/jpeg' ? jpeg : webp)
  )
    throw new HTTPException(415, {
      message: 'Use JPEG, PNG, or WebP. Export HEIC or PDF as an image first.',
    });
}
export async function boundedImage(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HTTPException(400, { message: 'Choose an image.' });
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new HTTPException(413, {
        message: 'Images must be 10MB or smaller.',
      });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function getCapture(env: Env, userId: string, id: string) {
  const row = await statement(
    env.DB,
    'SELECT * FROM captures WHERE id=? AND user_id=?',
    id,
    userId,
  ).first<CaptureRow>();
  if (!row) throw new HTTPException(404, { message: 'Capture not found' });
  return row;
}
export async function enqueue(env: Env, row: CaptureRow) {
  if (!env.CAPTURE_QUEUE)
    throw new HTTPException(503, {
      message: 'Image processing is unavailable. Enter the expense manually.',
    });
  try {
    await env.CAPTURE_QUEUE.send({ id: row.id, generation: row.generation });
  } catch {
    await statement(
      env.DB,
      "UPDATE captures SET status='failed',error=?,updated_at=? WHERE id=? AND generation=?",
      'Could not start processing. Retry or enter manually.',
      new Date().toISOString(),
      row.id,
      row.generation,
    ).run();
    throw new HTTPException(503, {
      message:
        'Could not start processing. Your upload is saved; retry it from Activity.',
    });
  }
}
export async function processCapture(env: Env, job: CaptureJob) {
  const row = await statement(
    env.DB,
    'SELECT * FROM captures WHERE id=? AND generation=?',
    job.id,
    job.generation,
  ).first<CaptureRow>();
  if (!row || ['ready', 'confirmed'].includes(row.status)) return true;
  const claim = await statement(
    env.DB,
    "UPDATE captures SET status='processing',attempt=attempt+1,error=NULL,updated_at=? WHERE id=? AND generation=? AND transaction_id IS NULL AND (status IN ('queued','failed') OR (status='processing' AND updated_at<?)) RETURNING attempt",
    new Date().toISOString(),
    row.id,
    job.generation,
    new Date(Date.now() - 120000).toISOString(),
  ).first<{ attempt: number }>();
  if (!claim) return false;
  try {
    if (!env.RECEIPTS || !env.AI)
      throw new Error('Capture storage or AI binding unavailable.');
    const object = await env.RECEIPTS.get(row.object_key);
    if (!object) throw new Error('Uploaded evidence is missing.');
    const categories = await statement(
      env.DB,
      'SELECT id,name,kind FROM categories WHERE user_id IS NULL OR user_id=?',
      row.user_id,
    ).all<{ id: string; name: string; kind: string }>();
    const extracted = await workersAI(env.AI).extract(
      await object.arrayBuffer(),
      row.mime_type,
      categories.results,
    );
    await statement(
      env.DB,
      "UPDATE captures SET status='ready',extracted_json=?,error=NULL,updated_at=? WHERE id=? AND generation=? AND attempt=? AND transaction_id IS NULL",
      JSON.stringify(extracted),
      new Date().toISOString(),
      row.id,
      job.generation,
      claim.attempt,
    ).run();
    return true;
  } catch (error) {
    await statement(
      env.DB,
      "UPDATE captures SET status='failed',error=?,updated_at=? WHERE id=? AND generation=? AND attempt=? AND transaction_id IS NULL",
      'Could not read this image. Retry with a clearer photo, or enter it manually.',
      new Date().toISOString(),
      row.id,
      job.generation,
      claim.attempt,
    ).run();
    throw error;
  }
}
export async function captureQueue(batch: MessageBatch<CaptureJob>, env: Env) {
  for (const message of batch.messages) {
    try {
      const finished = await processCapture(env, message.body);
      if (finished || message.attempts >= 5) message.ack();
      else message.retry({ delaySeconds: 60 });
    } catch {
      if (message.attempts >= 5) message.ack();
      else message.retry({ delaySeconds: Math.min(60, 10 * message.attempts) });
    }
  }
}

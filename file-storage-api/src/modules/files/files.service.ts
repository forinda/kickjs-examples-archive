import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { Inject, Service } from '@forinda/kickjs'
import type { Storage } from '@forinda/kickjs-storage'
import { STORAGE } from '@/adapters/storage.adapter'
import { env, storageDriver } from '@/config'

/** What may be uploaded, and the extension each type is stored under. */
export const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}
const TYPE_BY_EXT = Object.fromEntries(Object.entries(ALLOWED_TYPES).map(([t, e]) => [e, t]))

const PREFIX = 'files/'
/** `<uuid>.<ext>` — keys come from ids we generate, never from the client's filename. */
export const FILE_ID = /^[0-9a-f-]{36}\.[a-z]+$/

const sign = (id: string, expires: number) =>
  createHmac('sha256', env.SIGNING_SECRET).update(`${id}:${expires}`).digest('base64url')

@Service()
export class FilesService {
  @Inject(STORAGE) private readonly storage!: Storage

  async save(body: Uint8Array, contentType: string) {
    const id = `${randomUUID()}.${ALLOWED_TYPES[contentType]}`
    await this.storage.put(PREFIX + id, body, { contentType })
    return { id, size: body.byteLength, contentType }
  }

  async list(cursor?: string) {
    const page = await this.storage.list({ prefix: PREFIX, cursor, limit: 100 })
    return {
      files: page.files.map((f) => ({
        id: f.key.slice(PREFIX.length),
        size: f.size,
        contentType: this.typeOf(f.key, f.contentType),
        lastModified: f.lastModified,
      })),
      cursor: page.cursor ?? null,
    }
  }

  /** Stream + headers, or null when there is no such file. */
  async open(id: string) {
    const [info, body] = await Promise.all([
      this.storage.stat(PREFIX + id),
      this.storage.getStream(PREFIX + id),
    ])
    if (!info || !body) return null
    return { body, size: info.size, contentType: this.typeOf(id, info.contentType) }
  }

  exists(id: string) {
    return this.storage.exists(PREFIX + id)
  }

  async remove(id: string) {
    if (!(await this.exists(id))) return false
    await this.storage.delete(PREFIX + id)
    return true
  }

  /**
   * A bucket presigns its own GET URL (the bucket enforces the expiry). Disk has no
   * signer, so the app signs `/files/:id/signed?expires=&sig=` with SIGNING_SECRET.
   */
  async signedUrl(id: string, expiresIn: number, origin: string) {
    const expires = Math.floor(Date.now() / 1000) + expiresIn
    const url =
      storageDriver === 's3'
        ? await this.storage.url(PREFIX + id, { expiresIn })
        : `${origin}/api/v1/files/${id}/signed?expires=${expires}&sig=${sign(id, expires)}`
    return { url, expiresAt: new Date(expires * 1000).toISOString() }
  }

  verifySignature(id: string, expires: number, sig: string) {
    if (!Number.isInteger(expires) || expires < Date.now() / 1000) return false
    const want = Buffer.from(sign(id, expires))
    const got = Buffer.from(sig)
    return got.length === want.length && timingSafeEqual(got, want)
  }

  // Disk ignores contentType, so fall back to the extension we chose at upload.
  private typeOf(key: string, stored?: string) {
    return stored ?? TYPE_BY_EXT[key.split('.').pop()!] ?? 'application/octet-stream'
  }
}

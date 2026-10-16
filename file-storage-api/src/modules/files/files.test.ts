import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Container } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { memoryStorage } from '@forinda/kickjs-storage'
import { STORAGE } from '@/adapters/storage.adapter'
import { env } from '@/config'
import { FilesModule } from './files.module'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

async function makeApp() {
  const files = memoryStorage()
  const { client } = await createTestApp({
    modules: [FilesModule()],
    overrides: [[STORAGE, files]],
  })
  return { files, http: client(), api: client({ bearer: env.API_KEY }) }
}

/** Path + query of a signed URL, to call it through the test client. */
const pathOf = (url: string) => {
  const u = new URL(url)
  return u.pathname + u.search
}

describe('file-storage-api', () => {
  beforeEach(() => Container.reset())
  afterEach(() => vi.useRealTimers())

  it('uploads, lists, downloads and deletes a file', async () => {
    const { files, api } = await makeApp()
    const up = await api.post('/api/v1/files').attach('file', PNG, 'pic.png').expect(201)
    expect(up.body).toMatchObject({ size: PNG.length, contentType: 'image/png' })
    expect(up.body.id).toMatch(/\.png$/)
    expect(await files.exists(`files/${up.body.id}`)).toBe(true)

    const list = await api.get('/api/v1/files').expect(200)
    expect(list.body.files.map((f: { id: string }) => f.id)).toEqual([up.body.id])

    const down = await api.get(`/api/v1/files/${up.body.id}`).buffer(true).expect(200)
    expect(down.headers['content-type']).toBe('image/png')
    expect(Buffer.from(down.body)).toEqual(PNG)

    await api.delete(`/api/v1/files/${up.body.id}`).expect(204)
    await api.get(`/api/v1/files/${up.body.id}`).expect(404)
    await api.delete(`/api/v1/files/${up.body.id}`).expect(404)
  })

  it('answers 413 for a file over the limit and 415 for a type not allowed', async () => {
    const { files, api } = await makeApp()
    const big = Buffer.alloc(env.MAX_UPLOAD_BYTES + 1)
    await api.post('/api/v1/files').attach('file', big, 'big.png').expect(413)
    await api
      .post('/api/v1/files')
      .attach('file', Buffer.from('<script>'), { filename: 'x.html', contentType: 'text/html' })
      .expect(415)
    expect((await files.list()).files).toEqual([])
  })

  it('requires the API key', async () => {
    const { http } = await makeApp()
    await http.get('/api/v1/files').expect(401)
    await http.post('/api/v1/files').attach('file', PNG, 'pic.png').expect(401)
    await http.get('/api/v1/files').set('authorization', 'Bearer nope').expect(401)
  })

  it('serves a signed URL without the API key until it expires', async () => {
    const { http, api } = await makeApp()
    const { id } = (await api.post('/api/v1/files').attach('file', PNG, 'pic.png')).body
    const { body } = await api.get(`/api/v1/files/${id}/url?expiresIn=60`).expect(200)
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now())

    const ok = await http.get(pathOf(body.url)).buffer(true).expect(200)
    expect(Buffer.from(ok.body)).toEqual(PNG)

    // Tampered: another file's id, or a later expiry, with the same signature.
    await http.get(pathOf(body.url).replace(id, `${'0'.repeat(36)}.png`)).expect(403)
    await http.get(pathOf(body.url).replace(/expires=\d+/, 'expires=9999999999')).expect(403)

    // Expired.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 61_000)
    await http.get(pathOf(body.url)).expect(403)
  })

  it('refuses a signed URL for a missing file and an id that is not ours', async () => {
    const { api } = await makeApp()
    await api.get(`/api/v1/files/${'0'.repeat(36)}.png/url`).expect(404)
    await api.get('/api/v1/files/..%2Fsecret/url').expect(422)
  })
})

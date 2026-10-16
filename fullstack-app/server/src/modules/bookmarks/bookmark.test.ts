import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Container } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { createTestApp } from '@forinda/kickjs-testing'
import express from 'express'
import { DbAdapter } from '@/adapters/db.adapter'
import { database, migrationAdapter } from '@/db/client'
import { validationError } from '@/config/validation-error'
import { BookmarkModule } from './bookmark.module'

async function makeApp() {
  const { app } = await createTestApp({
    validationError,
    modules: [BookmarkModule()],
    middlewares: [express.json()],
    adapters: [
      DbAdapter(),
      kickDbAdapter({
        migrationAdapter,
        migrationsDir: 'db/migrations',
        migrationsOnBoot: 'apply',
      }),
    ],
  })
  return request(app.handle.bind(app))
}

describe('BookmarkController', () => {
  beforeEach(() => {
    Container.reset()
    const hasTable = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'bookmarks'")
      .get()
    if (hasTable) database.exec('DELETE FROM bookmarks')
  })

  it('creates, lists and deletes a bookmark', async () => {
    const http = await makeApp()
    const created = await http
      .post('/api/v1/bookmarks')
      .send({ url: 'https://kickjs.app', title: 'KickJS docs' })
      .expect(201)
    expect(created.body).toMatchObject({ url: 'https://kickjs.app', title: 'KickJS docs' })

    const list = await http.get('/api/v1/bookmarks').expect(200)
    expect(list.body).toHaveLength(1)

    await http.delete(`/api/v1/bookmarks/${created.body.id}`).expect(204)
    await http.delete(`/api/v1/bookmarks/${created.body.id}`).expect(404)
    expect((await http.get('/api/v1/bookmarks').expect(200)).body).toEqual([])
  })

  it('answers an invalid body with per-field errors', async () => {
    const http = await makeApp()
    const res = await http
      .post('/api/v1/bookmarks')
      .send({ url: 'not a url', title: '' })
      .expect(422)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'url', message: 'Enter a full http(s) URL' },
        { field: 'title', message: 'Title is required' },
      ]),
    )
  })
})

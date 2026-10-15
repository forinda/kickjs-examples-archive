import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Container, session } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { InertiaAdapter, inertiaErrorHandler, inertiaNotFound } from '@forinda/kickjs-inertia'
import { createTestApp } from '@forinda/kickjs-testing'
import express from 'express'
import { env } from '@/config'
import { database, migrationAdapter } from '@/db/client'
import { DbAdapter } from '@/db/db.adapter'
import { inertiaOptions } from '@/inertia'
import { NoteModule } from './note.module'

/**
 * Outside `kick dev` the adapter reads the client build's manifest, so tests
 * get a stub one — no `pnpm build` needed first — and a fixed asset version.
 */
const clientDir = mkdtempSync(join(tmpdir(), 'inertia-client-'))
mkdirSync(join(clientDir, '.vite'))
writeFileSync(
  join(clientDir, '.vite', 'manifest.json'),
  JSON.stringify({ 'src/client/main.tsx': { file: 'assets/main.js', isEntry: true } }),
)
const VERSION = 'test'

/** A cookie-keeping client, so flash data and errors survive the redirect like in a browser. */
async function makeApp() {
  const { app } = await createTestApp({
    modules: [NoteModule()],
    middlewares: [express.json(), session({ secret: env.SESSION_SECRET, store: 'cookie' })],
    adapters: [
      DbAdapter(),
      kickDbAdapter({
        migrationAdapter,
        migrationsDir: 'db/migrations',
        migrationsOnBoot: 'apply',
      }),
      InertiaAdapter({ ...inertiaOptions, clientDir, version: VERSION }),
    ],
    onError: inertiaErrorHandler(),
    onNotFound: inertiaNotFound(),
  })
  return request.agent(app.handle.bind(app))
}

const inertiaVisit = { 'X-Inertia': 'true', 'X-Inertia-Version': VERSION }

describe('NoteController', () => {
  beforeEach(() => {
    Container.reset()
    // One in-memory database per file: start each test empty (no table before the first boot).
    const hasTable = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'notes'")
      .get()
    if (hasTable) database.exec('DELETE FROM notes')
  })

  it('renders Notes/Index as a page object, with shared props and stats deferred', async () => {
    const http = await makeApp()
    const res = await http.get('/notes').set(inertiaVisit).expect(200)

    expect(res.headers['x-inertia']).toBe('true')
    expect(res.body.component).toBe('Notes/Index')
    expect(res.body.url).toBe('/notes')
    expect(res.body.props).toMatchObject({
      notes: [],
      appName: 'KickJS Notes',
      user: { name: 'Demo User' },
      errors: {},
    })
    expect(res.body.props).not.toHaveProperty('stats')
    expect(res.body.deferredProps).toEqual({ default: ['stats'] })
  })

  it('answers a first (non-Inertia) visit with the HTML shell carrying the same page', async () => {
    const http = await makeApp()
    const res = await http.get('/notes').expect(200).expect('Content-Type', /html/)
    expect(res.text).toContain('<title>Notes</title>')
    const json = res.text.match(/<script data-page="app" type="application\/json">(.*?)<\/script>/s)
    expect(JSON.parse(json![1]!).component).toBe('Notes/Index')
  })

  it('sends the deferred prop on the follow-up partial reload', async () => {
    const http = await makeApp()
    const res = await http
      .get('/notes')
      .set(inertiaVisit)
      .set('X-Inertia-Partial-Component', 'Notes/Index')
      .set('X-Inertia-Partial-Data', 'stats')
      .expect(200)
    expect(res.body.props.stats).toEqual({ total: 0, chars: 0 })
  })

  it('sends an invalid form back to the page with props.errors', async () => {
    const http = await makeApp()
    await http.get('/notes').set(inertiaVisit).expect(200) // the page the form is on

    const submit = await http.post('/notes').set(inertiaVisit).send({ title: 'x', body: '' })
    expect([302, 303]).toContain(submit.status)
    expect(submit.headers.location).toBe('/notes')

    const back = await http.get('/notes').set(inertiaVisit).expect(200)
    expect(back.body.props.errors.title).toBe('Title needs at least 3 characters')
    expect(back.body.props.notes).toEqual([])
  })

  it('answers API clients with a 422 instead', async () => {
    const http = await makeApp()
    await http.post('/notes').send({ title: 'x' }).expect(422)
  })

  it('creates, lists, edits and deletes a note, flashing after each save', async () => {
    const http = await makeApp()

    const created = await http
      .post('/notes')
      .set(inertiaVisit)
      .send({ title: 'Groceries', body: 'eggs, milk' })
    expect(created.status).toBe(303)
    expect(created.headers.location).toBe('/notes')

    const list = await http.get('/notes').set(inertiaVisit).expect(200)
    expect(list.body.flash).toEqual({ success: 'Saved “Groceries”' })
    expect(list.body.props.notes).toHaveLength(1)
    const id = list.body.props.notes[0].id
    expect(list.body.props.notes[0].title).toBe('Groceries')

    // Flash data is for one page only.
    const again = await http.get('/notes').set(inertiaVisit).expect(200)
    expect(again.body.flash).toEqual({})

    const edit = await http.get(`/notes/${id}/edit`).set(inertiaVisit).expect(200)
    expect(edit.body.component).toBe('Notes/Edit')
    expect(edit.body.props.note).toMatchObject({ id, title: 'Groceries', body: 'eggs, milk' })

    const updated = await http
      .put(`/notes/${id}`)
      .set(inertiaVisit)
      .send({ title: 'Groceries (Sat)', body: 'eggs' })
    expect(updated.status).toBe(303)
    const afterUpdate = await http.get('/notes').set(inertiaVisit).expect(200)
    expect(afterUpdate.body.flash).toEqual({ success: 'Updated “Groceries (Sat)”' })
    expect(afterUpdate.body.props.notes[0].title).toBe('Groceries (Sat)')

    const deleted = await http.delete(`/notes/${id}`).set(inertiaVisit)
    expect(deleted.status).toBe(303)
    const afterDelete = await http.get('/notes').set(inertiaVisit).expect(200)
    expect(afterDelete.body.flash).toEqual({ success: 'Note deleted' })
    expect(afterDelete.body.props.notes).toEqual([])

    await http.delete(`/notes/${id}`).set(inertiaVisit).expect(303)
    const gone = await http.get('/notes').set(inertiaVisit).expect(200)
    expect(gone.body.flash).toEqual({ error: 'That note was already deleted' })
  })

  it('renders the Error page for a missing note', async () => {
    const http = await makeApp()
    const res = await http.get('/notes/999/edit').set(inertiaVisit).expect(404)
    expect(res.body.component).toBe('Error')
    expect(res.body.props).toMatchObject({ status: 404, message: 'Note not found' })
  })
})

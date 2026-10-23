import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Container, formErrorHandler, getEnv, session } from '@forinda/kickjs'
import { kickDbAdapter } from '@forinda/kickjs-db'
import { KickView } from '@forinda/kickjs-view'
import { createTestApp } from '@forinda/kickjs-testing'
import express from 'express'
import '@/config'
import { DbAdapter } from '@/adapters/db.adapter'
import { database, migrationAdapter } from '@/db/client'
import { AuthModule } from '@/modules/auth/auth.module'
import { CategoriesModule } from '@/modules/categories/categories.module'
import { TasksModule } from '@/modules/tasks/tasks.module'
import { views } from '@/views'

/** A cookie-keeping client, so the session (sign-in, flash, form errors) survives redirects like in a browser. */
async function makeApp() {
  const { app } = await createTestApp({
    modules: [AuthModule(), TasksModule(), CategoriesModule()],
    middlewares: [
      express.urlencoded({ extended: false }),
      session({ secret: getEnv('SESSION_SECRET'), store: 'cookie' }),
    ],
    adapters: [
      DbAdapter(),
      kickDbAdapter({
        migrationAdapter,
        migrationsDir: 'db/migrations',
        migrationsOnBoot: 'apply',
      }),
      KickView({ views }),
    ],
    onError: formErrorHandler(),
  })
  return request.agent(app.handle.bind(app))
}

/** A browser form post: urlencoded, asking for HTML. */
const post = (http: request.Agent, url: string, body: string) =>
  http.post(url).type('form').set('accept', 'text/html').send(body)

async function signUp(email: string) {
  const http = await makeApp()
  await http.get('/register')
  const res = await post(http, '/register', `email=${email}&password=correct-horse`)
  expect(res.headers.location).toBe('/')
  return http
}

/** Task titles on the list page, in order. */
const titles = (html: string) =>
  [...html.matchAll(/class="title"[^>]*>([^<]+)</g)].map((m) => m[1]!.trim())

describe('tasks app', () => {
  beforeEach(() => {
    Container.reset()
    // One in-memory database per file: start each test empty (no tables before the first boot).
    const hasTable = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'")
      .get()
    if (hasTable) database.exec('DELETE FROM tasks; DELETE FROM categories; DELETE FROM users')
  })

  it('sends visitors who are not signed in to /login', async () => {
    const http = await makeApp()
    const res = await http.get('/').expect(302)
    expect(res.headers.location).toBe('/login')
  })

  it('sends an invalid form back with each field error and what was typed', async () => {
    const http = await makeApp()
    await http.get('/register')
    const res = await post(http, '/register', 'email=nope&password=short')
    expect(res.status).toBe(303)
    expect(res.headers.location).toBe('/register')

    const page = (await http.get('/register').expect(200)).text
    expect(page).toContain('Enter a valid email')
    expect(page).toContain('At least 8 characters')
    expect(page).toContain('value="nope"')
    // Passwords are never refilled.
    expect(page).not.toContain('value="short"')
  })

  it('registers, signs out and signs back in', async () => {
    const http = await signUp('ada@example.com')
    const home = (await http.get('/').expect(200)).text
    expect(home).toContain('ada@example.com')
    expect(home).toContain('Account created')

    await http.post('/logout').expect(303)
    await http.get('/').expect(302)

    const wrong = await post(http, '/login', 'email=ada@example.com&password=wrong-password')
    expect(wrong.text).toContain('Invalid email or password')
    const right = await post(http, '/login', 'email=ADA@example.com&password=correct-horse')
    expect(right.headers.location).toBe('/')
  })

  it('refuses a second account with the same email', async () => {
    await signUp('ada@example.com')
    const http = await makeApp()
    const res = await post(http, '/register', 'email=ada@example.com&password=correct-horse')
    expect(res.text).toContain('That email is already registered')
  })

  it('adds, filters, completes, edits and deletes tasks', async () => {
    const http = await signUp('ada@example.com')
    const page = (await http.get('/').expect(200)).text
    // The starter categories, as options of the new-task form.
    const personal = /<option value="(\d+)">Personal/.exec(page)![1]
    const work = /<option value="(\d+)">Work/.exec(page)![1]

    await post(http, '/tasks', `title=Buy milk&categoryId=${personal}&dueDate=2026-10-30`)
    await post(http, '/tasks', `title=Write report&categoryId=${work}&dueDate=`)
    await post(http, '/tasks', 'title=Loose end&categoryId=&dueDate=')
    const list = (await http.get('/').expect(200)).text
    expect(titles(list)).toEqual(['Loose end', 'Write report', 'Buy milk'])
    expect(list).toContain('due Oct 30, 2026')

    expect(titles((await http.get(`/?category=${work}`)).text)).toEqual(['Write report'])
    expect(titles((await http.get('/?category=none')).text)).toEqual(['Loose end'])

    const id = /\/tasks\/(\d+)\/edit"[^>]*>Buy milk/.exec(list)![1]
    await http.post(`/tasks/${id}/toggle`).expect(303)
    expect(titles((await http.get('/?status=done')).text)).toEqual(['Buy milk'])
    expect(titles((await http.get('/?status=open')).text)).toEqual(['Loose end', 'Write report'])

    const edit = (await http.get(`/tasks/${id}/edit`).expect(200)).text
    expect(edit).toContain('value="2026-10-30"')
    await post(
      http,
      `/tasks/${id}`,
      `title=Buy oat milk&notes=two cartons&categoryId=${personal}&dueDate=`,
    )
    const after = (await http.get('/')).text
    expect(after).toContain('Buy oat milk')
    expect(after).toContain('two cartons')

    await http.post(`/tasks/${id}/delete`).expect(303)
    expect(titles((await http.get('/')).text)).toEqual(['Loose end', 'Write report'])
  })

  it('an empty title goes back to the list with the error', async () => {
    const http = await signUp('ada@example.com')
    await http.get('/')
    const res = await post(http, '/tasks', 'title=&categoryId=&dueDate=')
    expect(res.headers.location).toBe('/')
    expect((await http.get('/')).text).toContain('Give the task a title')
  })

  it('deleting a category keeps its tasks, uncategorised', async () => {
    const http = await signUp('ada@example.com')
    const page = (await http.get('/categories').expect(200)).text
    const work = /href="\/\?category=(\d+)">Work/.exec(page)![1]
    await post(http, '/tasks', `title=Write report&categoryId=${work}&dueDate=`)

    await http.post(`/categories/${work}/delete`).expect(303)
    expect(titles((await http.get('/?category=none')).text)).toEqual(['Write report'])
  })

  it('refuses a duplicate category name', async () => {
    const http = await signUp('ada@example.com')
    const res = await post(http, '/categories', 'name=Work&color=%23000000')
    expect(res.text).toContain('You already have that category')
  })

  it("one user can't see or change another's tasks", async () => {
    const ada = await signUp('ada@example.com')
    await post(ada, '/tasks', 'title=Private&categoryId=&dueDate=')
    const id = /\/tasks\/(\d+)\/edit/.exec((await ada.get('/')).text)![1]

    const bob = await signUp('bob@example.com')
    expect(titles((await bob.get('/')).text)).toEqual([])
    await bob.get(`/tasks/${id}/edit`).expect(404)
    await bob.post(`/tasks/${id}/toggle`).expect(404)
    await bob.post(`/tasks/${id}/delete`).expect(404)
  })
})

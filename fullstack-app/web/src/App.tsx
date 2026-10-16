import { useEffect, useState, type FormEvent } from 'react'
import { KickClientError } from '@forinda/kickjs-client'
import { api } from './api'

// Every type here comes from the server's route map (KickClientApi, written by
// `kick typegen`) — nothing is declared by hand. Change what the server returns
// and this file stops compiling until it follows.
type Bookmark = KickClientApi.Api['GET /bookmarks']['response'][number]
type BookmarkInput = KickClientApi.Api['POST /bookmarks']['body']
type FieldErrors = Partial<Record<keyof BookmarkInput | 'form', string>>

/** The server's 422 carries `errors: [{ field, message }]` (problem+json). */
function fieldErrors(err: unknown): FieldErrors {
  if (!(err instanceof KickClientError)) return { form: 'Network error — is the server up?' }
  const body = err.body as { errors?: { field: string; message: string }[] } | undefined
  if (err.status !== 422 || !body?.errors) return { form: err.message }
  return Object.fromEntries(body.errors.map((e) => [e.field, e.message]))
}

export function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [form, setForm] = useState<BookmarkInput>({ url: '', title: '' })
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    api.get('/bookmarks').then(setBookmarks, (e) => setErrors(fieldErrors(e)))
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      const created = await api.post('/bookmarks', { body: form })
      setBookmarks((list) => [created, ...list])
      setForm({ url: '', title: '' })
      setErrors({})
    } catch (err) {
      setErrors(fieldErrors(err))
    }
  }

  async function remove(id: number) {
    try {
      await api.delete('/bookmarks/:id', { params: { id: String(id) } })
      setBookmarks((list) => list.filter((b) => b.id !== id))
    } catch (err) {
      setErrors(fieldErrors(err))
    }
  }

  return (
    <main
      style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '3rem auto', padding: '0 1rem' }}
    >
      <h1>Bookmarks</h1>

      {/* noValidate: let the server's schema be the one that answers. */}
      <form onSubmit={add} noValidate style={{ display: 'grid', gap: '0.5rem' }}>
        <label>
          URL
          <input
            name="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            aria-invalid={!!errors.url}
            aria-describedby="url-error"
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        {errors.url && (
          <small id="url-error" style={{ color: 'crimson' }}>
            {errors.url}
          </small>
        )}
        <label>
          Title
          <input
            name="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            aria-invalid={!!errors.title}
            aria-describedby="title-error"
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        {errors.title && (
          <small id="title-error" style={{ color: 'crimson' }}>
            {errors.title}
          </small>
        )}
        <button type="submit">Add bookmark</button>
        {errors.form && (
          <p role="alert" style={{ color: 'crimson' }}>
            {errors.form}
          </p>
        )}
      </form>

      <ul>
        {bookmarks.map((b) => (
          <li key={b.id}>
            <a href={b.url}>{b.title}</a>{' '}
            <small>{new Date(b.createdAt).toLocaleDateString()}</small>{' '}
            <button onClick={() => remove(b.id)} aria-label={`Delete ${b.title}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {bookmarks.length === 0 && <p style={{ color: '#666' }}>No bookmarks yet.</p>}
    </main>
  )
}

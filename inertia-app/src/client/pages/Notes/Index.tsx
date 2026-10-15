import { Deferred, Head, Link, router, useForm } from '@inertiajs/react'
import { Layout } from '~/Layout'
import { NoteForm, type NoteFields } from '~/NoteForm'

interface NoteRow {
  id: number
  title: string
  updatedAt: string
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function NotesIndex({
  notes,
  stats,
}: {
  notes: NoteRow[]
  // A deferred prop: undefined on the first render, filled in a moment later.
  stats?: { total: number; chars: number }
}) {
  const form = useForm<NoteFields>({ title: '', body: '' })
  return (
    <Layout>
      <Head title="Notes" />
      <div className="page-head">
        <h1>Notes</h1>
        <Deferred data="stats" fallback={<span className="muted skeleton">Counting…</span>}>
          <span className="muted">
            {stats?.total} {stats?.total === 1 ? 'note' : 'notes'} · {stats?.chars} characters
          </span>
        </Deferred>
      </div>

      {notes.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No notes yet</p>
          <p className="muted">Write your first one below.</p>
        </div>
      ) : (
        <ul className="notes">
          {notes.map((note) => (
            <li key={note.id} className="card note">
              <Link href={`/notes/${note.id}/edit`} className="note-link">
                <span className="note-title">{note.title}</span>
                <span className="muted small">Updated {when(note.updatedAt)}</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost-danger"
                aria-label={`Delete “${note.title}”`}
                onClick={() => {
                  if (confirm(`Delete “${note.title}”? This can't be undone.`)) {
                    router.delete(`/notes/${note.id}`, { preserveScroll: true })
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="card">
        <h2>New note</h2>
        <NoteForm
          form={form}
          label="Add note"
          busyLabel="Adding…"
          submit={() =>
            form.post('/notes', { preserveScroll: true, onSuccess: () => form.reset() })
          }
        />
      </section>
    </Layout>
  )
}

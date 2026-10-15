import { Head, Link, useForm } from '@inertiajs/react'
import { Layout } from '~/Layout'
import { NoteForm, type NoteFields } from '~/NoteForm'

export default function NotesEdit({ note }: { note: { id: number } & NoteFields }) {
  const form = useForm<NoteFields>({ title: note.title, body: note.body })
  return (
    <Layout>
      <Head title={`Edit: ${note.title}`} />
      <p>
        <Link href="/notes" className="back">
          ← All notes
        </Link>
      </p>
      <section className="card">
        <h1>Edit note</h1>
        <NoteForm
          form={form}
          label="Save changes"
          busyLabel="Saving…"
          submit={() => form.put(`/notes/${note.id}`)}
        />
      </section>
    </Layout>
  )
}

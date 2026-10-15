import type { InertiaFormProps } from '@inertiajs/react'

export interface NoteFields {
  title: string
  body: string
}

/**
 * Title + body with the server's validation errors under each field. On a
 * failed submit Inertia keeps `form.data`, so the input stays as typed.
 */
export function NoteForm({
  form,
  submit,
  label,
  busyLabel,
}: {
  form: InertiaFormProps<NoteFields>
  submit: () => void
  label: string
  busyLabel: string
}) {
  return (
    <form
      className="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="field">
        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          value={form.data.title}
          onChange={(event) => form.setData('title', event.target.value)}
          aria-invalid={Boolean(form.errors.title)}
          aria-describedby={form.errors.title ? 'note-title-error' : undefined}
          placeholder="Groceries"
        />
        {form.errors.title && (
          <p id="note-title-error" className="field-error">
            {form.errors.title}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="note-body">Note</label>
        <textarea
          id="note-body"
          rows={4}
          value={form.data.body}
          onChange={(event) => form.setData('body', event.target.value)}
          aria-invalid={Boolean(form.errors.body)}
          aria-describedby={form.errors.body ? 'note-body-error' : undefined}
          placeholder="Eggs, milk, coffee…"
        />
        {form.errors.body && (
          <p id="note-body-error" className="field-error">
            {form.errors.body}
          </p>
        )}
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={form.processing}>
          {form.processing ? busyLabel : label}
        </button>
      </div>
    </form>
  )
}

import {
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Post,
  Put,
  type Ctx,
} from '@forinda/kickjs'
import { defer, flash, inertia, redirect } from '@forinda/kickjs-inertia'
import { z } from 'zod'
import { NOTE_REPOSITORY, type NoteRepository } from './note.repository'

export const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: 'Title needs at least 3 characters' })
    .max(120, { error: 'Keep the title under 120 characters' }),
  body: z.string().max(5000, { error: 'Notes are capped at 5000 characters' }).default(''),
})

/** `:id` from the URL, or 404 — a malformed id is just a page that doesn't exist. */
function noteId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) throw HttpException.notFound('Note not found')
  return id
}

@Controller()
export class NoteController {
  @Inject(NOTE_REPOSITORY) private readonly notes!: NoteRepository

  @Get('/')
  home() {
    return redirect('/notes')
  }

  @Get('/notes')
  index() {
    return inertia('Notes/Index', {
      // A function is only called when the prop is actually sent.
      notes: () => this.notes.list(),
      // Left out of the first response; the client fetches it right after render.
      stats: defer(() => this.notes.stats()),
    })
  }

  // A failed schema check on an Inertia visit redirects back to the form with
  // props.errors (inertiaErrorHandler in src/index.ts); API clients get a 422.
  @Post('/notes', { body: noteSchema })
  async create(ctx: Ctx<KickRoutes.NoteController['create']>) {
    const note = await this.notes.create(ctx.body)
    flash(ctx, { success: `Saved “${note.title}”` })
    return redirect('/notes')
  }

  @Get('/notes/:id/edit')
  async edit(ctx: Ctx<KickRoutes.NoteController['edit']>) {
    const note = await this.notes.find(noteId(ctx.params.id))
    if (!note) throw HttpException.notFound('Note not found')
    return inertia('Notes/Edit', { note })
  }

  @Put('/notes/:id', { body: noteSchema })
  async update(ctx: Ctx<KickRoutes.NoteController['update']>) {
    if (!(await this.notes.update(noteId(ctx.params.id), ctx.body))) {
      throw HttpException.notFound('Note not found')
    }
    flash(ctx, { success: `Updated “${ctx.body.title}”` })
    return redirect('/notes')
  }

  @Delete('/notes/:id')
  async remove(ctx: Ctx<KickRoutes.NoteController['remove']>) {
    const deleted = await this.notes.remove(noteId(ctx.params.id))
    // Already gone (another tab?) — say so on the list rather than an error page.
    flash(ctx, deleted ? { success: 'Note deleted' } : { error: 'That note was already deleted' })
    return redirect('/notes')
  }
}

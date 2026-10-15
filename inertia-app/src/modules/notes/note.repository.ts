import { createToken } from '@forinda/kickjs'
import type { AppDb } from '../../db/client'

export interface NoteInput {
  title: string
  body: string
}

export function createNoteRepository(db: AppDb) {
  return {
    list() {
      return db
        .selectFrom('notes')
        .select(['id', 'title', 'updatedAt'])
        .orderBy('updatedAt', 'desc')
        .orderBy('id', 'desc')
        .execute()
    },

    find(id: number) {
      return db.selectFrom('notes').selectAll().where('id', '=', id).executeTakeFirst()
    },

    create(input: NoteInput) {
      return db.insertInto('notes').values(input).returningAll().executeTakeFirstOrThrow()
    },

    async update(id: number, input: NoteInput) {
      const res = await db
        .updateTable('notes')
        .set({ ...input, updatedAt: new Date() })
        .where('id', '=', id)
        .executeTakeFirst()
      return Number(res.numUpdatedRows) > 0
    },

    async remove(id: number) {
      const res = await db.deleteFrom('notes').where('id', '=', id).executeTakeFirst()
      return Number(res.numDeletedRows) > 0
    },

    /** Deliberately the "expensive" query — the page loads it as a deferred prop. */
    async stats() {
      const row = await db
        .selectFrom('notes')
        .select((eb) => [
          eb.fn.countAll<number>().as('total'),
          eb.fn.sum<number>(eb.fn('length', ['body'])).as('chars'),
        ])
        .executeTakeFirstOrThrow()
      return { total: Number(row.total), chars: Number(row.chars ?? 0) }
    },
  }
}

/** The contract, derived from the factory rather than declared beside it. */
export type NoteRepository = ReturnType<typeof createNoteRepository>
export const NOTE_REPOSITORY = createToken<NoteRepository>('app/Note/repository')

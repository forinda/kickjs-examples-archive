import { createToken } from '@forinda/kickjs'
import type { AppDb } from '@/db/client'
import type { BookmarkInput } from './bookmark.dto'

export function createBookmarkRepository(db: AppDb) {
  return {
    list() {
      return db.selectFrom('bookmarks').selectAll().orderBy('id', 'desc').execute()
    },

    create(input: BookmarkInput) {
      return db.insertInto('bookmarks').values(input).returningAll().executeTakeFirstOrThrow()
    },

    async remove(id: number) {
      const res = await db.deleteFrom('bookmarks').where('id', '=', id).executeTakeFirst()
      return Number(res.numDeletedRows) > 0
    },
  }
}

export type BookmarkRepository = ReturnType<typeof createBookmarkRepository>
export const BOOKMARK_REPOSITORY = createToken<BookmarkRepository>('app/Bookmark/repository')

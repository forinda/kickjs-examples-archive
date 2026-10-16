import { defineModule } from '@forinda/kickjs'
import { APP_DB } from '@/adapters/db.adapter'
import { BookmarkController } from './bookmark.controller'
import { BOOKMARK_REPOSITORY, createBookmarkRepository } from './bookmark.repository'

export const BookmarkModule = defineModule({
  name: 'BookmarkModule',
  build: () => ({
    register(container) {
      container.registerFactory(BOOKMARK_REPOSITORY, () =>
        createBookmarkRepository(container.resolve(APP_DB)),
      )
    },
    routes: () => ({ path: '/bookmarks', controller: BookmarkController }),
  }),
})

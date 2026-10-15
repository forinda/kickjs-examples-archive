import { defineModule } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import { createCommentRepository, COMMENT_REPOSITORY } from './comment.repository'
import { CommentController } from './comment.controller'

export const CommentModule = defineModule({
  name: 'CommentModule',
  build: () => ({
    register(container) {
      container.registerFactory(COMMENT_REPOSITORY, () =>
        createCommentRepository(container.resolve(DRIZZLE_DB)),
      )
    },
    routes: () => ({ path: '/comments', controller: CommentController }),
  }),
})

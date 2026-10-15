import { defineModule } from '@forinda/kickjs'
import { CommentsController } from './comments.controller'
import {
  COMMENT_REPOSITORY,
  createCommentRepository,
} from './comment.repository'
import { MONGO_CONNECTION } from '@/adapters/mongoose.adapter'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const CommentsModule = defineModule({
  name: 'CommentsModule',
  build: () => ({
    register(container) {
      container.registerFactory(COMMENT_REPOSITORY, () =>
        createCommentRepository(container.resolve(MONGO_CONNECTION)),
      )
    },
    routes: () => ({ path: '/', controller: CommentsController }),
  }),
})

import { defineModule } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'
import { MongoCommentRepository } from './infrastructure/repositories/mongo-comment.repository'
import { CommentsController } from './presentation/comments.controller'

// Eagerly load decorated classes so @Controller()/@Service()/@Repository()/@Job()/@Cron()
// decorators register in the DI container.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const CommentsModule = defineModule({
  name: 'CommentsModule',
  build: () => ({
    register(container) {
      container.registerFactory(TOKENS.COMMENT_REPOSITORY, () =>
        container.resolve(MongoCommentRepository),
      )
    },
    routes: () => ({ path: '/', controller: CommentsController }),
  }),
})

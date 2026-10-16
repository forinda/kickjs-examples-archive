import { Service, Inject, Logger, JOB_DISPATCHER, type JobDispatcher } from '@forinda/kickjs'
import type { CreateCommentDto } from './comment.dto'
import {
  COMMENT_REPOSITORY,
  type CommentRepository,
} from './comment.repository'
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '@/modules/tasks/task.repository'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/user.repository'

const logger = Logger.for('CommentsService')

@Service()
export class CommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private commentRepo: CommentRepository,
    @Inject(TASK_REPOSITORY) private taskRepo: TaskRepository,
    @Inject(USER_REPOSITORY) private userRepo: UserRepository,
    @Inject(JOB_DISPATCHER) private jobs: JobDispatcher,
  ) {}

  async create(taskId: string, authorId: string, dto: CreateCommentDto) {
    // Parse @mentions
    const mentionMatches = dto.body.match(/@([a-zA-Z0-9._-]+)/g) || []
    const mentionEmails = mentionMatches.map((m) => m.slice(1))
    const mentionUsers = await Promise.all(
      mentionEmails.map((email) => this.userRepo.findByEmail(email)),
    )
    const mentions = mentionUsers.filter(Boolean).map((u) => u!._id)

    const comment = await this.commentRepo.create({
      taskId: taskId as any,
      authorId: authorId as any,
      body: dto.body,
      mentions: mentions as any[],
      parentCommentId: dto.parentCommentId as any,
    })

    await this.taskRepo.incrementCommentCount(taskId, 1)

    // Queue mention notification emails
    const task = await this.taskRepo.findById(taskId)
    const author = await this.userRepo.findById(authorId)
    const mentionedUsers = mentionUsers.filter(Boolean)

    for (const user of mentionedUsers) {
      if (!user || user._id.toString() === authorId) continue
      try {
        await this.jobs.dispatch('email', 'send-mentioned', {
          email: user.email,
          taskKey: task?.key ?? taskId,
          mentionedBy: author ? `${author.firstName} ${author.lastName}` : 'Someone',
        })
      } catch {
        logger.warn(`Failed to queue mention email for ${user.email}`)
      }
    }

    return comment
  }
}

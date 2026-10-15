import type { DrizzleQueryParamsConfig } from '@/shared/query-adapter'
import { comments } from '@/db/schema'

export const COMMENT_QUERY_CONFIG: DrizzleQueryParamsConfig = {
  columns: {
    taskId: comments.taskId,
    authorId: comments.authorId,
  },
  sortable: {
    createdAt: comments.createdAt,
  },
  searchColumns: [comments.content],
}

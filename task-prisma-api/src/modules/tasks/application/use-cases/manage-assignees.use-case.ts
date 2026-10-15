import { Service, Inject } from '@forinda/kickjs'
import {
  TASK_ASSIGNEE_REPOSITORY,
  type TaskAssigneeRepository,
} from '@/modules/tasks/task-assignee.repository'

@Service()
export class ManageAssigneesUseCase {
  constructor(
    @Inject(TASK_ASSIGNEE_REPOSITORY)
    private readonly assigneeRepo: TaskAssigneeRepository,
  ) {}

  async addAssignee(taskId: string, userId: string) {
    return this.assigneeRepo.add(taskId, userId)
  }

  async removeAssignee(taskId: string, userId: string) {
    await this.assigneeRepo.remove(taskId, userId)
  }

  async getAssignees(taskId: string) {
    return this.assigneeRepo.findByTask(taskId)
  }
}

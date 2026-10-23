import {
  Autowired,
  Controller,
  Get,
  Middleware,
  Post,
  flash,
  type RequestContext,
} from '@forinda/kickjs'
import { currentUser, requireUser } from '@/auth/require-user'
import { CategoriesService } from '@/modules/categories/categories.service'
import { taskSchema, type TaskInput } from './tasks.schemas'
import { TasksService, type TaskFilter } from './tasks.service'

const STATUSES = ['all', 'open', 'done'] as const

@Controller()
@Middleware(requireUser)
export class TasksController {
  @Autowired() private tasks!: TasksService
  @Autowired() private categories!: CategoriesService

  @Get('/')
  async index(ctx: RequestContext) {
    const user = currentUser(ctx)
    const q = ctx.query as Record<string, string | undefined>
    const filter: TaskFilter = {
      category: q.category === 'none' ? 'none' : Number(q.category) || undefined,
      status: STATUSES.find((s) => s === q.status) ?? 'all',
    }
    const [tasks, categories] = await Promise.all([
      this.tasks.list(user.id, filter),
      this.categories.list(user.id),
    ])
    const open = tasks.filter((t) => !t.done).length
    await ctx.render('tasks/index', {
      title: 'Tasks',
      tasks,
      categories,
      open,
      filter: { category: filter.category ?? null, status: filter.status },
      statuses: STATUSES,
      // The filter links keep the other filter; kvQuery leaves out the nulls.
      query: {
        category: filter.category ?? null,
        status: filter.status === 'all' ? null : filter.status,
      },
    })
  }

  @Post('/tasks', { body: taskSchema })
  async create(ctx: RequestContext) {
    await this.tasks.create(currentUser(ctx).id, ctx.body as TaskInput)
    flash(ctx, { success: 'Task added' })
    ctx.redirect(back(ctx), 303)
  }

  @Get('/tasks/:id/edit')
  async edit(ctx: RequestContext) {
    const user = currentUser(ctx)
    const task = await this.tasks.find(user.id, Number(ctx.params.id))
    if (!task) return ctx.notFound()
    await ctx.render('tasks/edit', {
      title: `Edit: ${task.title}`,
      task,
      dueValue: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : '',
      categories: await this.categories.list(user.id),
    })
  }

  @Post('/tasks/:id', { body: taskSchema })
  async update(ctx: RequestContext) {
    const ok = await this.tasks.update(
      currentUser(ctx).id,
      Number(ctx.params.id),
      ctx.body as TaskInput,
    )
    if (!ok) return ctx.notFound()
    flash(ctx, { success: 'Task saved' })
    ctx.redirect('/', 303)
  }

  @Post('/tasks/:id/toggle')
  async toggle(ctx: RequestContext) {
    const done = await this.tasks.toggle(currentUser(ctx).id, Number(ctx.params.id))
    if (done === undefined) return ctx.notFound()
    ctx.redirect(back(ctx), 303)
  }

  @Post('/tasks/:id/delete')
  async remove(ctx: RequestContext) {
    if (!(await this.tasks.remove(currentUser(ctx).id, Number(ctx.params.id))))
      return ctx.notFound()
    flash(ctx, { info: 'Task deleted' })
    ctx.redirect(back(ctx), 303)
  }
}

/** The list page the form was on, with its filters; never another site. */
function back(ctx: RequestContext): string {
  const ref = ctx.headers.referer
  if (!ref) return '/'
  const url = new URL(ref)
  return url.host === ctx.headers.host && url.pathname === '/' ? `/${url.search}` : '/'
}

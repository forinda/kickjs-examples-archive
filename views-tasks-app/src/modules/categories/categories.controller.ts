import {
  Autowired,
  Controller,
  Get,
  Middleware,
  Post,
  flash,
  type RequestContext,
} from '@forinda/kickjs'
import { z } from 'zod'
import { currentUser, requireUser } from '@/auth/require-user'
import { CategoriesService } from './categories.service'

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name it').max(60, 'At most 60 characters'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour')
    .default('#6b7280'),
})

@Controller()
@Middleware(requireUser)
export class CategoriesController {
  @Autowired() private categories!: CategoriesService

  @Get('/')
  async index(ctx: RequestContext) {
    await ctx.render('categories/index', {
      title: 'Categories',
      categories: await this.categories.list(currentUser(ctx).id),
    })
  }

  @Post('/', { body: categorySchema })
  async create(ctx: RequestContext) {
    const user = currentUser(ctx)
    const input = ctx.body as z.output<typeof categorySchema>
    if (await this.categories.exists(user.id, input.name))
      return ctx.render('categories/index', {
        title: 'Categories',
        categories: await this.categories.list(user.id),
        $errors: { name: 'You already have that category' },
        $old: input,
      })
    await this.categories.create(user.id, input)
    flash(ctx, { success: `Added ${input.name}` })
    ctx.redirect('/categories', 303)
  }

  @Post('/:id/delete')
  async remove(ctx: RequestContext) {
    if (!(await this.categories.remove(currentUser(ctx).id, Number(ctx.params.id))))
      return ctx.notFound()
    flash(ctx, { info: 'Category deleted; its tasks are uncategorised now' })
    ctx.redirect('/categories', 303)
  }
}

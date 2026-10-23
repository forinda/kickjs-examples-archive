import {
  Controller,
  Get,
  Inject,
  Post,
  flash,
  hashPassword,
  verifyPassword,
  type RequestContext,
} from '@forinda/kickjs'
import { APP_DB } from '@/adapters/db.adapter'
import type { AppDb } from '@/db/client'
import { loginSchema, registerSchema } from './auth.schemas'
import '@/auth/types'

@Controller()
export class AuthController {
  @Inject(APP_DB) private db!: AppDb

  @Get('/login')
  async loginPage(ctx: RequestContext) {
    if (ctx.session.data.userId) return ctx.redirect('/')
    await ctx.render('auth/login', { title: 'Sign in' })
  }

  @Post('/login', { body: loginSchema })
  async login(ctx: RequestContext) {
    const { email, password } = ctx.body as { email: string; password: string }
    const user = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()
    const { ok, needsRehash } = await verifyPassword(password, user?.passwordHash)
    if (!ok || !user)
      return ctx.render('auth/login', {
        title: 'Sign in',
        $errors: { form: 'Invalid email or password' },
        $old: { email },
      })
    if (needsRehash)
      await this.db
        .updateTable('users')
        .set({ passwordHash: await hashPassword(password) })
        .where('id', '=', user.id)
        .execute()
    await this.signIn(ctx, user.id)
    flash(ctx, { success: 'Welcome back' })
    ctx.redirect('/', 303)
  }

  @Get('/register')
  async registerPage(ctx: RequestContext) {
    if (ctx.session.data.userId) return ctx.redirect('/')
    await ctx.render('auth/register', { title: 'Create account' })
  }

  @Post('/register', { body: registerSchema })
  async register(ctx: RequestContext) {
    const { email, password } = ctx.body as { email: string; password: string }
    const taken = await this.db
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst()
    if (taken)
      return ctx.render('auth/register', {
        title: 'Create account',
        $errors: { email: 'That email is already registered' },
        $old: { email },
      })
    const user = await this.db
      .insertInto('users')
      .values({ email, passwordHash: await hashPassword(password) })
      .returning('id')
      .executeTakeFirstOrThrow()
    // Starter categories, so the first task has somewhere to go.
    await this.db
      .insertInto('categories')
      .values([
        { userId: user.id, name: 'Personal', color: '#2563eb' },
        { userId: user.id, name: 'Work', color: '#d97706' },
      ])
      .execute()
    await this.signIn(ctx, user.id)
    flash(ctx, { success: 'Account created' })
    ctx.redirect('/', 303)
  }

  @Post('/logout')
  async logout(ctx: RequestContext) {
    await ctx.session.destroy()
    ctx.redirect('/login', 303)
  }

  private async signIn(ctx: RequestContext, userId: number) {
    // A new session id at sign-in: an id planted before it is worthless after.
    await ctx.session.regenerate()
    ctx.session.data.userId = userId
  }
}

import {
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Post,
  reply,
  type Ctx,
} from '@forinda/kickjs'
import { bookmarkSchema } from './bookmark.dto'
import { BOOKMARK_REPOSITORY, type BookmarkRepository } from './bookmark.repository'

// Return-value handlers: `kick typegen` reads each return type into the
// client route map, so web/ never declares a response type of its own.
@Controller()
export class BookmarkController {
  @Inject(BOOKMARK_REPOSITORY) private readonly bookmarks!: BookmarkRepository

  @Get('/')
  list() {
    return this.bookmarks.list()
  }

  @Post('/', { body: bookmarkSchema })
  async create(ctx: Ctx<KickRoutes.BookmarkController['create']>) {
    return reply.created(await this.bookmarks.create(ctx.body))
  }

  @Delete('/:id')
  async remove(ctx: Ctx<KickRoutes.BookmarkController['remove']>) {
    if (!(await this.bookmarks.remove(Number(ctx.params.id)))) {
      throw HttpException.notFound('Bookmark not found')
    }
    return reply.noContent()
  }
}

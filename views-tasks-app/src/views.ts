/// <reference types="@forinda/kickjs-view/virtual" />
import kickViews from 'virtual:kick-views'
import type { RequestContext } from '@forinda/kickjs'
import { createViews } from '@forinda/kickjs-view'
import './auth/types'

export const views = createViews({
  ...kickViews,
  layout: 'layouts/main',
  // Signed-in pages set the user; the sign-in pages have none.
  share: (ctx) => ({ user: (ctx as RequestContext | undefined)?.get('user') ?? null }),
})

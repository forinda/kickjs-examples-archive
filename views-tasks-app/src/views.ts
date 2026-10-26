/// <reference types="@forinda/kickjs-view/virtual" />
import kickViews from 'virtual:kick-views'
import { csrfToken } from '@forinda/kickjs'
import { createViews } from '@forinda/kickjs-view'
import './auth/types'

export const views = createViews({
  ...kickViews,
  layout: 'layouts/main',
  // Signed-in pages set the user; the sign-in pages have none. Every form posts
  // the CSRF token as its _csrf field.
  share: (ctx) => ({ user: ctx?.get('user') ?? null, csrfToken: csrfToken(ctx) }),
})

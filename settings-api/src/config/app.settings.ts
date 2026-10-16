import { defineSettings } from '@forinda/kickjs'
import { z } from 'zod'
import { devDefault } from './dev-default'

/** App-wide section — declared in `bootstrap({ settings })`. Reads APP_*. */
export const AppSettings = defineSettings(
  'APP',
  z.object({
    name: z.string().default('settings-api').describe('Display name'),
    publicUrl: devDefault(z.url(), 'http://localhost:3000').describe(
      'Where clients reach this API (links in emails)',
    ),
  }),
)

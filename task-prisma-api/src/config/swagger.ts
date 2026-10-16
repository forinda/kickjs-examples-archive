import type { AppAdapter } from '@forinda/kickjs'
import { SwaggerAdapter } from '@forinda/kickjs-swagger'
import { isDevOrTest } from './dev-default'

/**
 * /docs and /openapi.json under development/test only. The spec lists every
 * route and schema — not something to publish from a production server, and
 * an unset NODE_ENV counts as production.
 */
export function swaggerAdapters(): AppAdapter[] {
  return isDevOrTest()
    ? [
        SwaggerAdapter({
          info: { title: 'Vibed (Prisma Edition)', version: '1.0.0' },
        }),
      ]
    : []
}

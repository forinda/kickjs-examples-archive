import type { InertiaAdapterOptions } from '@forinda/kickjs-inertia'

/**
 * InertiaAdapter options shared by the app (src/index.ts) and its tests.
 * `Partial`: the exported options type lists defaulted fields (`clientDir`) as required.
 */
export const inertiaOptions = {
  title: 'Notes',
  entry: 'src/client/main.tsx',
  // Props every page receives. `user` stands in for whatever your auth puts on ctx.
  share: () => ({
    appName: 'KickJS Notes',
    user: { name: 'Demo User' },
  }),
  // Unknown URLs and thrown errors render src/client/pages/Error.tsx.
  errorPage: 'Error',
} satisfies Partial<InertiaAdapterOptions>

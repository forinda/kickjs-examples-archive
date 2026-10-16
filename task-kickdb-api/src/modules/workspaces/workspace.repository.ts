import { createToken } from '@forinda/kickjs'
import type { KickDbClient } from '@forinda/kickjs-db'

export interface NewWorkspace {
  name: string
  slug: string
  description?: string | null
  ownerId: string
}

/** Repository over the kick/db client; deps come in as parameters. */
export function createWorkspaceRepository(db: KickDbClient) {
  return {
    list() {
      return db.selectFrom('workspaces').selectAll().orderBy('createdAt', 'asc').execute()
    },

    findById(id: string) {
      return db.selectFrom('workspaces').selectAll().where('id', '=', id).executeTakeFirst()
    },

    // Single round-trip fetch of a workspace plus its members + projects
    // via the relational query layer. Replaces the three-query N+1
    // (workspace → workspaceMembers → projects) the controller used to
    // assemble for the "workspace overview" view.
    //
    // The `with` keys are checked against the `KickDbRelationsRegister`
    // augmentation emitted by `kick typegen` — mistyping a key here is
    // a compile error, not a runtime surprise.
    //
    // Pass `ctx.signal` from the controller to cancel the in-flight
    // query when the HTTP client disconnects mid-request.
    findFullById(id: string, signal?: AbortSignal) {
      return db.query.workspaces.findUnique({
        where: (_w, eb) => eb('id', '=', id),
        with: {
          owner: { columns: { passwordHash: false } },
          members: { with: { user: { columns: { passwordHash: false } } } },
          projects: true,
        },
        signal,
      })
    },

    // Workspaces a user owns. Same nesting as `findFullById` so the
    // caller can render the same "workspace card" component without
    // round-tripping per row. Accepts `ctx.signal` to cancel the
    // potentially-expensive nested aggregation on client disconnect.
    listOwnedByUser(userId: string, signal?: AbortSignal) {
      return db.query.workspaces.findMany({
        where: (_w, eb) => eb('ownerId', '=', userId),
        orderBy: (_w, eb) => eb.ref('createdAt'),
        with: {
          members: { with: { user: { columns: { passwordHash: false } } } },
          projects: true,
        },
        signal,
      })
    },

    create(input: NewWorkspace) {
      return db
        .insertInto('workspaces')
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          ownerId: input.ownerId,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    },
  }
}

/** The contract, derived from the factory rather than declared beside it. */
export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>
export const WORKSPACE_REPOSITORY = createToken<WorkspaceRepository>('app/Workspace/repository')

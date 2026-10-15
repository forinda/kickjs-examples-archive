/**
 * BYO auth — replaces the removed `@forinda/kickjs-auth` package.
 * Composed from framework primitives (context decorators, route flags,
 * `defineAdapter`) following the BYO Auth recipe:
 * https://kickjs.app/guide/byo-recipes#auth
 */
import jwt from "jsonwebtoken";
import {
  createToken,
  defineAdapter,
  defineHttpContextDecorator,
  defineRouteFlag,
  HttpException,
  type RequestContext,
} from "@forinda/kickjs";

export interface AuthUser {
  id: string;
  email: string;
  roles: readonly string[];
  /** Subdomains of the tenants this user belongs to (the token's `tenants` claim). */
  tenants: readonly string[];
}

declare module "@forinda/kickjs" {
  interface ContextMeta {
    user: AuthUser | null;
  }
}

/** A strategy turns a request into a user, or `null` if its credential is absent/invalid. */
export interface AuthStrategy {
  name: string;
  validate(ctx: RequestContext): Promise<AuthUser | null> | AuthUser | null;
}

export function jwtStrategy(opts: {
  secret: string;
  mapPayload: (payload: jwt.JwtPayload) => AuthUser;
}): AuthStrategy {
  return {
    name: "jwt",
    validate: (ctx) => {
      const header = ctx.headers.authorization;
      if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
      try {
        return opts.mapPayload(jwt.verify(header.slice(7), opts.secret) as jwt.JwtPayload);
      } catch {
        return null;
      }
    },
  };
}

export const AUTH_STRATEGIES = createToken<readonly AuthStrategy[]>("app/Auth/strategies");

/** Marks a route (or every route on a controller) as reachable without a user. */
export const Public = defineRouteFlag("auth.public");

/**
 * Resolves `ctx.get('user')`. `on401: 'reject'` (default) answers 401 when no
 * strategy matches; `'allow'` passes through with `user: null`.
 */
export const LoadAuthUser = defineHttpContextDecorator.withParams<{
  on401: "allow" | "reject";
}>()({
  key: "user",
  deps: { strategies: AUTH_STRATEGIES },
  skipWhen: "auth.public",
  paramDefaults: { on401: "reject" },
  resolve: async (ctx, { strategies }, params) => {
    for (const strategy of strategies) {
      const user = await strategy.validate(ctx);
      if (user) return user;
    }
    if (params.on401 === "allow") return null;
    throw HttpException.unauthorized();
  },
});

export const AuthAdapter = defineAdapter<{
  strategies: readonly AuthStrategy[];
  /** `'protected'`: every route needs a user unless `@Public`. `'open'`: opt in per route with `@LoadAuthUser()`. */
  defaultPolicy: "protected" | "open";
}>({
  name: "AuthAdapter",
  build: (opts) => ({
    beforeStart: ({ container }) => {
      container.registerInstance(AUTH_STRATEGIES, opts.strategies);
    },
    contributors: () => [
      LoadAuthUser.with({ on401: opts.defaultPolicy === "protected" ? "reject" : "allow" })
        .registration,
    ],
  }),
});

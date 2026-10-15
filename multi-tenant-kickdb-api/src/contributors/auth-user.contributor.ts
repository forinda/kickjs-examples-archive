import { defineHttpContextDecorator, HttpException } from "@forinda/kickjs";
import { AUTH_STRATEGIES } from "@/auth";

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

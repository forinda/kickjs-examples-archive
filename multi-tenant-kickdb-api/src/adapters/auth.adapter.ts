import { defineAdapter } from "@forinda/kickjs";
import { AUTH_STRATEGIES, type AuthStrategy } from "@/auth";
import { LoadAuthUser } from "@/contributors/auth-user.contributor";

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

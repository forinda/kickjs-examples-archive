import { createToken, defineAdapter } from "@forinda/kickjs";
import { database, db, type AppDb } from "./client";

export const APP_DB = createToken<AppDb>("app/Db");

/**
 * Owns the database lifecycle: registers the client under APP_DB, answers
 * `GET /health/ready` with a `SELECT 1`, and closes the handle on shutdown.
 */
export const DbAdapter = defineAdapter({
  name: "DbAdapter",
  build: () => ({
    beforeStart: ({ container }) => {
      container.registerInstance(APP_DB, db);
    },
    onHealthCheck: async () => {
      try {
        database.prepare("SELECT 1").get();
        return { name: "sqlite", status: "up" as const };
      } catch {
        return { name: "sqlite", status: "down" as const };
      }
    },
    shutdown: () => {
      if (database.open) database.close();
    },
  }),
});

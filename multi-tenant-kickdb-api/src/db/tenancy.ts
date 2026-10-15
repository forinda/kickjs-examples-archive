import { defineTenancy } from "@forinda/kickjs-db";

/**
 * 'column' strategy: kick/db adds `tenantId = <current tenant>` to every
 * select/update/delete on a tenanted table and fills it on insert. The current
 * tenant is the request's `tenant` context value (set by LoadTenant).
 * 'rls' and 'schema' are Postgres-only; 'column' works on SQLite.
 */
export const tenancy = defineTenancy({ strategy: "column" });

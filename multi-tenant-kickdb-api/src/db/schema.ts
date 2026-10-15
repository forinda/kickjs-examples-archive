import { index, table, tenantKey, text, timestamp, uuid, varchar } from "@forinda/kickjs-db";
import { tenancy } from "./tenancy";

/** Tenant registry — not tenanted itself. Seeded by the `seed_tenants` migration. */
export const tenants = table("tenants", {
  id: varchar(64).primaryKey(),
  name: varchar(120).notNull(),
  subdomain: varchar(63).notNull().unique(),
});

export const projects = table(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: tenantKey(tenancy), // marks the table tenanted
    title: varchar(200).notNull(),
    description: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("projects_tenant_idx").on(t.tenantId),
  }),
);

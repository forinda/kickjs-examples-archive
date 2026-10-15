import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Container } from "@forinda/kickjs";
import { kickDbAdapter } from "@forinda/kickjs-db";
import { createTestApp } from "@forinda/kickjs-testing";
import { env } from "@/config";
import { jwtStrategy } from "@/auth";
import { AuthAdapter } from "@/adapters/auth.adapter";
import { migrationAdapter } from "@/db/client";
import { DbAdapter } from "@/adapters/db.adapter";
import { ProjectModule } from "./project.module";

async function makeApp() {
  const { app } = await createTestApp({
    modules: [ProjectModule()],
    adapters: [
      DbAdapter(),
      kickDbAdapter({
        migrationAdapter,
        migrationsDir: "db/migrations",
        migrationsOnBoot: "apply",
      }),
      AuthAdapter({
        defaultPolicy: "open",
        strategies: [
          jwtStrategy({
            secret: env.JWT_SECRET,
            mapPayload: (p) => ({
              id: p.sub!,
              email: p.email,
              roles: [],
              tenants: p.tenants ?? [],
            }),
          }),
        ],
      }),
    ],
  });
  return request(app.handle.bind(app));
}

const bearer = (tenants: string[]) => ({
  Authorization: `Bearer ${jwt.sign({ sub: "u1", email: "a@example.test", tenants }, env.JWT_SECRET)}`,
});
const auth = bearer(["acme", "globex"]);

describe("ProjectController", () => {
  beforeEach(() => Container.reset());

  it("rejects requests without a token", async () => {
    const http = await makeApp();
    await http.get("/api/v1/projects").set("x-tenant", "acme").expect(401);
  });

  it("answers 404 for an unknown tenant", async () => {
    const http = await makeApp();
    await http.get("/api/v1/projects").set("x-tenant", "nope").set(auth).expect(404);
  });

  it("refuses a tenant the user does not belong to", async () => {
    const http = await makeApp();
    const acmeOnly = bearer(["acme"]);
    await http.get("/api/v1/projects").set("x-tenant", "acme").set(acmeOnly).expect(200);
    await http.get("/api/v1/projects").set("x-tenant", "globex").set(acmeOnly).expect(403);
    await http
      .post("/api/v1/projects")
      .set("Host", "globex.localhost")
      .set(acmeOnly)
      .send({ title: "Not mine" })
      .expect(403);
  });

  it("keeps each tenant's projects apart", async () => {
    const http = await makeApp();
    const created = await http
      .post("/api/v1/projects")
      .set("x-tenant", "acme")
      .set(auth)
      .send({ title: "Rocket skates" })
      .expect(201);
    expect(created.body.tenantId).toBe("tenant-acme");

    const acme = await http.get("/api/v1/projects").set("x-tenant", "acme").set(auth).expect(200);
    expect(acme.body.tenant).toBe("Acme Corp");
    expect(acme.body.projects.map((p: { title: string }) => p.title)).toEqual(["Rocket skates"]);

    const globex = await http
      .get("/api/v1/projects")
      .set("Host", "globex.localhost")
      .set(auth)
      .expect(200);
    expect(globex.body.projects).toEqual([]);
  });
});

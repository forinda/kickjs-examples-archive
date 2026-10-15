import { Controller, Get, Inject, Post, reply, type Ctx } from "@forinda/kickjs";
import { z } from "zod";
import { fromZod } from "@forinda/kickjs-schema/zod";
import { LoadAuthUser } from "../../auth";
import { LoadTenant } from "../../tenant.context";
import { PROJECT_REPOSITORY, type ProjectRepository } from "./project.repository";

export const createProjectSchema = fromZod(
  z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullish(),
  }),
);

@Controller()
@LoadTenant // every query below runs as this tenant
// The app's default policy is 'open'; this controller requires a user.
@LoadAuthUser({ on401: "reject" })
export class ProjectController {
  @Inject(PROJECT_REPOSITORY) private readonly projects!: ProjectRepository;

  @Get("/")
  async list(ctx: Ctx<KickRoutes.ProjectController["list"]>) {
    return { tenant: ctx.get("tenant")?.name, projects: await this.projects.list() };
  }

  @Post("/", { body: createProjectSchema })
  async create(ctx: Ctx<KickRoutes.ProjectController["create"]>) {
    return reply.created(await this.projects.create(ctx.body));
  }
}

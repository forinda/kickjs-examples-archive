import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import {
  Container,
  Controller,
  Get,
  Delete,
  Inject,
  reply,
  HttpException,
  buildRoutes,
  type RequestContext,
  type ParsedQuery,
} from '@forinda/kickjs'
import { createTestApp, createTestModule } from '@forinda/kickjs-testing'
import {
  PROJECT_REPOSITORY,
  type NewProject,
  type Project,
  type ProjectRepository,
} from './project.repository'

// ── In-memory repository ─────────────────────────────────────────────

class InMemoryProjectRepository implements ProjectRepository {
  private projects: Project[] = [
    {
      id: 'p1',
      workspaceId: 'ws1',
      name: 'Alpha',
      key: 'ALP',
      description: null,
      leadId: null,
      taskCounter: 0,
      isArchived: false,
      statusColumns: [
        { name: 'todo', order: 0, color: '#94a3b8' },
        { name: 'done', order: 1, color: '#22c55e' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'p2',
      workspaceId: 'ws1',
      name: 'Beta',
      key: 'BET',
      description: 'Second project',
      leadId: null,
      taskCounter: 5,
      isArchived: false,
      statusColumns: [{ name: 'todo', order: 0, color: '#94a3b8' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  async findById(id: string) {
    return this.projects.find((p) => p.id === id) ?? null
  }

  async findByWorkspace(workspaceId: string) {
    return this.projects.filter((p) => p.workspaceId === workspaceId)
  }

  async findPaginated(parsed: ParsedQuery) {
    const page = parsed.pagination?.page ?? 1
    const limit = parsed.pagination?.limit ?? 20
    const start = (page - 1) * limit
    return { data: this.projects.slice(start, start + limit), total: this.projects.length }
  }

  async create(dto: NewProject) {
    const project: Project = {
      id: `p${this.projects.length + 1}`,
      workspaceId: dto.workspaceId,
      name: dto.name,
      key: dto.key,
      description: dto.description ?? null,
      leadId: dto.leadId ?? null,
      taskCounter: dto.taskCounter ?? 0,
      isArchived: dto.isArchived ?? false,
      statusColumns: dto.statusColumns ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.projects.push(project)
    return project
  }

  async update(id: string, dto: Partial<NewProject>) {
    const project = this.projects.find((p) => p.id === id)
    if (!project) throw new Error('Not found')
    Object.assign(project, dto, { updatedAt: new Date() })
    return project
  }

  async incrementTaskCounter(id: string) {
    const project = this.projects.find((p) => p.id === id)
    if (!project) throw new Error('Not found')
    project.taskCounter += 1
    return { taskCounter: project.taskCounter, key: project.key }
  }

  async delete(id: string) {
    this.projects = this.projects.filter((p) => p.id !== id)
  }
}

// ── Test controller (no auth middleware) ──────────────────────────────

@Controller()
class TestProjectController {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}

  @Get('/')
  async list(ctx: RequestContext) {
    const projects = await this.repo.findByWorkspace('ws1')
    return { data: projects, total: projects.length }
  }

  @Get('/:id')
  async getById(ctx: RequestContext) {
    const project = await this.repo.findById(ctx.params.id)
    if (!project) throw HttpException.notFound('Project not found')
    return { data: project }
  }

  @Delete('/:id')
  async remove(ctx: RequestContext) {
    await this.repo.delete(ctx.params.id)
    return reply.noContent()
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('ProjectController (integration)', () => {
  beforeEach(() => Container.reset())

  function buildTestModule() {
    return createTestModule({
      register: (c) => {
        c.registerFactory(PROJECT_REPOSITORY, () => new InMemoryProjectRepository())
        c.register(TestProjectController, TestProjectController)
      },
      routes: () => ({
        path: '/projects',
        router: buildRoutes(TestProjectController),
        controller: TestProjectController,
      }),
    })
  }

  it('GET /api/v1/projects returns project list', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    const res = await request(app.handle.bind(app)).get('/api/v1/projects').expect(200)

    expect(res.body.data).toHaveLength(2)
    expect(res.body.total).toBe(2)
    expect(res.body.data[0]).toHaveProperty('name', 'Alpha')
  })

  it('GET /api/v1/projects/:id returns a single project', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    const res = await request(app.handle.bind(app)).get('/api/v1/projects/p1').expect(200)

    expect(res.body.data.name).toBe('Alpha')
    expect(res.body.data.key).toBe('ALP')
  })

  it('GET /api/v1/projects/:id returns 404 for unknown project', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).get('/api/v1/projects/unknown').expect(404)
  })

  it('DELETE /api/v1/projects/:id removes the project', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).delete('/api/v1/projects/p1').expect(204)

    await request(app.handle.bind(app)).get('/api/v1/projects/p1').expect(404)
  })

  it('DELETE then list shows reduced count', async () => {
    const { app } = await createTestApp({ modules: [buildTestModule()] })

    await request(app.handle.bind(app)).delete('/api/v1/projects/p1').expect(204)

    const res = await request(app.handle.bind(app)).get('/api/v1/projects').expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Beta')
  })
})

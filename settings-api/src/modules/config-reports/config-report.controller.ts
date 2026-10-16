import { Controller, createToken, Get, Inject, type Application } from '@forinda/kickjs'

type App = Pick<Application, 'describeConfig' | 'configOrigins'>

/** The running app — bound in src/index.ts once bootstrap() returns. */
export const APPLICATION = createToken<App>('app/Application')

/** Never echo a secret's default, even a dev one. */
const SECRET = /PASSWORD|SECRET|TOKEN|_KEY$/

@Controller()
export class ConfigReportController {
  @Inject(APPLICATION) private readonly app!: App

  /**
   * Every variable the app reads — env schema and each declared section —
   * with who declared it, whether it's required, its default, and where the
   * current value came from (env, file, default, provided, unset). Values
   * themselves are never returned.
   */
  @Get('/')
  report() {
    const described = this.app.describeConfig()
    const origins = this.app.configOrigins()
    const originOf = new Map(
      [...origins.env, ...origins.sections.flatMap((s) => s.vars)].map((v) => [v.name, v.origin]),
    )
    const vars = <T extends { name: string; default?: unknown }>(list: T[]) =>
      list.map((v) => ({
        ...v,
        ...(SECRET.test(v.name) && v.default !== undefined ? { default: '********' } : {}),
        origin: originOf.get(v.name) ?? 'unset',
      }))
    return {
      env: vars(described.env),
      sections: described.sections.map((s) => ({ ...s, vars: vars(s.vars) })),
    }
  }
}

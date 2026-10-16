import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { Container } from '@forinda/kickjs'
import { createTestApp } from '@forinda/kickjs-testing'
import { AppSettings } from '@/config/app.settings'
import { FeatureSettings } from './feature.settings'
import { FeaturesModule } from './feature.module'
import { FeaturesService } from './feature.service'

describe('FeaturesModule', () => {
  it('injects its section into the service, parsed from the env', async () => {
    process.env.FEATURES_BETA_TESTERS = 'ann@example.com,bob@example.com'
    process.env.FEATURES_SIGNUPS = 'false'
    try {
      const { app } = await createTestApp({ modules: [FeaturesModule()], settings: [AppSettings] })
      const http = request(app.handle.bind(app))

      const res = await http.get('/api/v1/features').expect(200)
      expect(res.body).toEqual({
        app: 'settings-api',
        signupUrl: null,
        betaBanner: false,
        maxUploadBytes: 10 * 1024 * 1024,
      })
      // The list is read server-side only; the endpoint takes no email.
      const features = Container.getInstance().resolve(FeaturesService)
      expect(features.isBetaTester('Ann@example.com')).toBe(true)
      expect(features.isBetaTester('eve@example.com')).toBe(false)
      const probe = await http.get('/api/v1/features?email=ann@example.com').expect(200)
      expect(probe.body.betaBanner).toBe(false)
    } finally {
      delete process.env.FEATURES_BETA_TESTERS
      delete process.env.FEATURES_SIGNUPS
    }
  })

  it('takes a provided value instead of the environment', async () => {
    const { app } = await createTestApp({
      modules: [FeaturesModule()],
      settings: [AppSettings, FeatureSettings.provide({ maxUploadMb: 1 })],
    })
    const res = await request(app.handle.bind(app)).get('/api/v1/features').expect(200)
    expect(res.body).toMatchObject({
      signupUrl: 'http://localhost:3000/signup',
      maxUploadBytes: 1048576,
    })
  })
})

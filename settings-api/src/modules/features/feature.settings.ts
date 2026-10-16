import { defineSettings } from '@forinda/kickjs'
import { z } from 'zod'

/** Declared by FeaturesModule — only required when that module is mounted. Reads FEATURES_*. */
export const FeatureSettings = defineSettings(
  'FEATURES',
  z.object({
    signups: z.stringbool().default(true).describe('Accept new sign-ups'),
    betaBanner: z.stringbool().default(false).describe('Show the beta banner to everyone'),
    maxUploadMb: z.coerce.number().int().positive().default(10),
    betaTesters: z.array(z.email()).default([]).describe('Always see the beta banner'),
  }),
)

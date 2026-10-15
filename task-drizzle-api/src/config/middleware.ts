import express from 'express'
import { cors, helmet, requestId, requestLogger, type MiddlewareEntry } from '@forinda/kickjs'

export const middlewares: MiddlewareEntry[] = [
  helmet(),
  cors({ origin: '*' }),
  requestId(),
  requestLogger(),
  express.json({ limit: '10mb' }),
  express.urlencoded({ extended: true }),
]

import express from 'express'
import { cors, helmet, requestId, requestLogger } from '@forinda/kickjs'

export const middlewares = [
  helmet(),
  cors({ origin: '*' }),
  requestId(),
  requestLogger(),
  express.json({ limit: '10mb' }),
  express.urlencoded({ extended: true }),
]

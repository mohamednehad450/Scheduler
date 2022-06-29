import { Express } from 'express'
import { AppDB } from '../db'
import { CRUD } from './utils'

const route = '/sequence'

export default (app: Express, db: AppDB,) => CRUD(app, db.sequencesDb, route, (s) => Number(s))
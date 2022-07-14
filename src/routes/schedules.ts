import { Express } from 'express'
import { AppDB } from '../db'
import { CRUD } from './utils'

const route = '/schedule'

export default (app: Express, db: AppDB,) => CRUD(app, db.scheduleDb, route, (s) => Number(s))
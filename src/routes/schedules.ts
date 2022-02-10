import { Express } from 'express'
import { validateSchedule } from '../pi'
import { AppDB } from '../db'
import { CRUD } from './utils'

const route = '/schedule'

export default (app: Express, db: AppDB,) => CRUD(app, db.schedulesDb, route, validateSchedule)
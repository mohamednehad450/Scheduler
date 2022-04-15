import { Express } from 'express'
import { AppDB } from '../db'
import { CRUD } from './utils'
import { validateSequenceData } from '../pi'

const route = '/sequence'

export default (app: Express, db: AppDB,) => CRUD(app, db.sequencesDb, route, validateSequenceData)
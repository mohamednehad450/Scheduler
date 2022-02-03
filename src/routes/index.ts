import { Express } from 'express'
import { AppDB } from '../db'
import actions from './actions'
import schedules from './schedules'


export default (app: Express, db: AppDB) => {
    schedules(app, db)
    actions(app, db)
}
import { Express } from 'express'
import { AppDB } from '../db'
import actions from './actions'
import pins from './pins'
import schedules from './schedules'


export default (app: Express, db: AppDB) => {
    schedules(app, db)
    actions(app, db)
    pins(app, db)
}
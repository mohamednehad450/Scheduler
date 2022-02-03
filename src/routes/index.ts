import { Express } from 'express'
import { AppDB } from '../db'
import schedules from './schedules'


export default (app: Express, db: AppDB) => {
    schedules(app, db)
}
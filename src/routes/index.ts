import { Express } from 'express'
import { AppDB } from '../db'
import actions from './actions'
import pins from './pins'
import sequences from './sequences'


export default (app: Express, db: AppDB) => {
    sequences(app, db)
    actions(app, db)
    pins(app, db)
}
import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import pins from './pins'
import sequences from './sequences'


export default (app: Express, io: Server, db: AppDB) => {
    sequences(app, db)
    actions(io, db)
    pins(app, db)
}
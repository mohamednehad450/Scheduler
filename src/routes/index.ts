import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import { CRUD } from './utils'

const routes = {
    SEQUENCE: '/sequence',
    PIN: '/pin',
    SCHEDULE: '/schedule',
}
const stringToNum = (s: string) => Number(s)

export default (app: Express, io: Server, db: AppDB) => {
    CRUD(app, db.sequencesDb, routes.SEQUENCE, stringToNum)
    CRUD(app, db.pinsDb, routes.PIN, stringToNum)
    CRUD(app, db.scheduleDb, routes.SCHEDULE, stringToNum)
    actions(io, db)
}
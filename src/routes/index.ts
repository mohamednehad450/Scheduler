import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import { CRUD, Events } from './utils'

const routes = {
    SEQUENCE: '/sequence',
    // /sequences and /sequence/:id are created with CRUD
    SEQUENCE_EVENTS: '/sequence/event',
    // /sequence/events and /sequence/events/:id are created with Events
    PIN: '/pin',
    // /pins and /pin/:id are created with CRUD
    SCHEDULE: '/schedule',
    // /schedules and /schedule/:id are created with CRUD

}
const stringToNum = (s: string) => Number(s)

export default (app: Express, io: Server, db: AppDB) => {
    Events(app, db.sequenceEventsDb, routes.SEQUENCE_EVENTS, stringToNum)
    CRUD(app, db.sequencesDb, routes.SEQUENCE, stringToNum)
    CRUD(app, db.pinsDb, routes.PIN, stringToNum)
    CRUD(app, db.scheduleDb, routes.SCHEDULE, stringToNum)
    actions(io, db)
}
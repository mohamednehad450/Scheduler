import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import { cronSequenceLink, CRUD, Events } from './utils'

const routes = {
    SEQUENCE: '/sequence',
    // /sequences and /sequence/:id are created with CRUD
    SEQUENCE_EVENTS: '/sequence/event',
    // /sequence/events and /sequence/events/:id are created with Events
    PIN: '/pin',
    // /pins and /pin/:id are created with CRUD
    CRON: '/cron',
    // /crons and /cron/:id are created with CRUD,
    LINK: '/link'
    // /link/cron/:id and /link/sequence/:id are created with cronSequenceLink

}
const stringToNum = (s: string) => Number(s)

export default (app: Express, io: Server, db: AppDB) => {
    Events(app, db.sequenceEventsDb, routes.SEQUENCE_EVENTS, stringToNum)
    CRUD(app, db.sequencesDb, routes.SEQUENCE, stringToNum)
    CRUD(app, db.pinsDb, routes.PIN, stringToNum)
    CRUD(app, db.cronDb, routes.CRON, stringToNum)
    cronSequenceLink(app, db.cronSequenceLink, routes.LINK, stringToNum)
    actions(io, db)
}
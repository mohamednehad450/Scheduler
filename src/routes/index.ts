import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import { cronSequenceLink, CRUD, Events } from './utils'

const routes = {
    SEQUENCE: '/sequence',
    PIN: '/pin',
    CRON: '/cron',
    EVENTS: {
        SEQUENCE: "/events/sequences"
    },
    LINK: '/link'
    // /link/cron/:id and /link/sequence/:id are created with cronSequenceLink

}
const stringToNum = (s: string) => Number(s)

export default (app: Express, io: Server, db: AppDB) => {
    app.use(routes.EVENTS.SEQUENCE, Events(db.sequenceEventsDb, stringToNum))
    app.use(routes.SEQUENCE, CRUD(db.sequencesDb, stringToNum))
    app.use(routes.PIN, CRUD(db.pinsDb, stringToNum))
    app.use(routes.CRON, CRUD(db.cronDb, stringToNum))
    app.use(routes.LINK, cronSequenceLink(db.cronSequenceLink, stringToNum))
    actions(io, db)
}
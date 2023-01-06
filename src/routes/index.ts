import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import { authCRUD, cronSequenceLink, CRUD, Events, withAuth } from './utils'

const routes = {
    SEQUENCE: '/sequence',
    PIN: '/pin',
    CRON: '/cron',
    EVENTS: {
        SEQUENCE: "/event/sequence"
    },
    LINK: '/link',
    // /link/cron/:id and /link/sequence/:id are created with cronSequenceLink
    AUTH: '/auth'

}
const stringToNum = (s: string) => Number(s) || -1

export default (app: Express, io: Server, db: AppDB) => {
    app.use(routes.EVENTS.SEQUENCE, withAuth, Events(db.sequenceEventsDb, stringToNum))
    app.use(routes.SEQUENCE, withAuth, CRUD(db.sequencesDb, stringToNum))
    app.use(routes.PIN, withAuth, CRUD(db.pinsDb, stringToNum))
    app.use(routes.CRON, withAuth, CRUD(db.cronDb, stringToNum))
    app.use(routes.LINK, withAuth, cronSequenceLink(db.cronSequenceLink, stringToNum))
    app.use(routes.AUTH, authCRUD(db.adminDb))
    actions(io, db)
}
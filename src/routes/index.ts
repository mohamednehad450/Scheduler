import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import { authCRUD, cronSequenceLink, CRUDRouter, EventRouter, withAuth } from './utils'

const routes = {
    SEQUENCE: '/sequence',
    PIN: '/pin',
    CRON: '/cron',
    EVENTS: {
        SEQUENCE: "/event/sequence"
    },
    LINK: '/link',
    // /link/cron/:id and /link/sequence/:id are created with cronSequenceLink
    AUTH: '/auth',
    ACTION: '/action',

}
const stringToNum = (s: string) => Number(s) || -1

export default async (app: Express, io: Server, db: AppDB) => {
    app.use(routes.EVENTS.SEQUENCE, withAuth, EventRouter(db.sequenceEventCRUD, String))
    app.use(routes.SEQUENCE, withAuth, CRUDRouter(db.sequenceDb, String, db.resolvers.resolveSequence))
    app.use(routes.CRON, withAuth, CRUDRouter(db.cronDb, String, db.resolvers.resolveCron))
    app.use(routes.PIN, withAuth, CRUDRouter(db.pinDb, stringToNum))
    app.use(routes.LINK, withAuth, cronSequenceLink(db.cronSequenceLink, String))
    app.use(routes.ACTION, withAuth, await actions(io, db))
    app.use(routes.AUTH, authCRUD(db.adminCRUD))
}
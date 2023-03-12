import { Express } from 'express'
import { Server } from 'socket.io'
import { AppDB } from '../db'
import actions from './actions'
import CRUDRouter from './CRUDRouter'
import { authCRUD, cronSequenceLink, EventRouter, withAuth } from './utils'

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


export default async (app: Express, io: Server, db: AppDB) => {
    app.use(
        routes.EVENTS.SEQUENCE,
        withAuth,
        EventRouter(db.sequenceEventDb, (item) => item.sequenceId, db.resolvers.resolveSequenceEvent)
    )
    app.use(
        routes.SEQUENCE,
        withAuth,
        CRUDRouter(db.sequenceDb, db.resolvers.resolveSequence)
    )
    app.use(
        routes.CRON,
        withAuth,
        CRUDRouter(db.cronDb, db.resolvers.resolveCron)
    )
    app.use(
        routes.PIN,
        withAuth,
        CRUDRouter(db.pinDb, undefined, parseInt)
    )
    app.use(
        routes.LINK,
        withAuth,
        cronSequenceLink(db.cronSequenceLink)
    )
    app.use(
        routes.ACTION,
        withAuth,
        await actions(io, db)
    )
    app.use(
        routes.AUTH,
        authCRUD(db.adminManager)
    )
}
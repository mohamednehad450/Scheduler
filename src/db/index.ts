import { sequenceValidators, cronValidators, pinsValidators, sequenceEventsValidators } from "./validators"
import SequenceEventCRUD from "./SequenceEventCRUD"
import SequenceCRUD from "./SequenceCRUD"
import AdminCRUD from "./AdminCRUD"
import CronCRUD from "./CronCRUD"
import PinCRUD from "./PinsCRUD"
import JSONDb from "./JSONDb"
import CronSequenceLink from "./CronSequenceLink"
import { cronCSLink, pinSequenceLink, sequenceCSLink, sequenceEventLink } from "./dbLinks"
import { Admin, BaseCron, BaseSequence, BaseSequenceEvent, CronSequence, Pin } from "./types"

type AppDB = {
    sequenceCRUD: SequenceCRUD,
    pinCRUD: PinCRUD,
    cronCRUD: CronCRUD,
    adminCRUD: AdminCRUD,
    sequenceEventCRUD: SequenceEventCRUD
    cronSequenceLink: CronSequenceLink
}

const initDb = async (): Promise<AppDB> => {

    const sequenceDb = new JSONDb<BaseSequence['id'], BaseSequence>("database", "sequences", sequenceValidators, s => s.id)
    const pinDb = new JSONDb<Pin['channel'], Pin>("database", "pins", pinsValidators, p => p.channel)
    const cronDb = new JSONDb<BaseCron['id'], BaseCron>("database", "crons", cronValidators, s => s.id)
    const adminDb = new JSONDb<Admin['username'], Admin>("database", "admin", {}, u => u.username)
    const sequenceEventDb = new JSONDb<BaseSequenceEvent['id'], BaseSequenceEvent>("database", "sequencesEvents", sequenceEventsValidators, s => s.id)
    const cronSequenceDb = new JSONDb<void, CronSequence>("database", "cronSequence", {}, s => s.sequenceId + s.cronId)


    pinDb.linkForeignDb(pinSequenceLink(sequenceDb))
    sequenceDb.linkForeignDb(sequenceEventLink(sequenceEventDb))
    sequenceDb.linkForeignDb(sequenceCSLink(cronSequenceDb))
    cronDb.linkForeignDb(cronCSLink(cronSequenceDb))

    await Promise.all([
        sequenceDb.init(),
        pinDb.init(),
        cronDb.init(),
        adminDb.init(),
        sequenceEventDb.init(),
        cronSequenceDb.init()
    ])

    const sequenceCRUD = new SequenceCRUD(sequenceDb, sequenceEventDb, cronDb, cronSequenceDb)
    const cronCRUD = new CronCRUD(cronDb, sequenceDb, cronSequenceDb)
    const cronSequenceLink = new CronSequenceLink(cronSequenceDb, sequenceCRUD, cronCRUD)
    const pinCRUD = new PinCRUD(pinDb, sequenceCRUD)
    const adminCRUD = new AdminCRUD(adminDb)
    const sequenceEventCRUD = new SequenceEventCRUD(sequenceEventDb, sequenceDb)


    return {
        sequenceCRUD,
        pinCRUD,
        cronCRUD,
        adminCRUD,
        sequenceEventCRUD,
        cronSequenceLink
    }
}



export { initDb }
export type { AppDB }

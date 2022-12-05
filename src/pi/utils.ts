import { AppDB, CronDbType, SequenceDBType } from "../db";
import Sequence from "./Sequence";


const triggerCron = (cronDb: AppDB['cronDb'], id: CronDbType['id'], sequences: { [key: SequenceDBType['id']]: Sequence }) => {
    cronDb.get(id)
        .then(cron => cron && runIfActive(cron.CronSequence, sequences))
        .catch(err => {
            console.error(`Failed to trigger Cronjob (id:${id}), database error`, err)
            // TODO
        })
}



const runIfActive = (ids: CronDbType['CronSequence'], sequences: { [key: SequenceDBType['id']]: Sequence }) => {
    ids.forEach(({ sequence: { id } }) => {
        if (sequences[id]?.isActive()) {
            sequences[id]?.run()
        }
    })
}


export {
    triggerCron,
    runIfActive,
}
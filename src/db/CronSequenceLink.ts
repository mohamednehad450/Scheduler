import Joi, { ArraySchema } from "joi";
import CronCRUD from "./CronCRUD";
import JSONDb from "./JSONDb";
import SequenceCRUD from "./SequenceCRUD";
import { BaseCron, BaseSequence, Cron, CronSequence, Sequence } from "./types";


interface CronSequenceLinkInterface {
    linkSequence: (sequenceId: BaseSequence['id'], cronsIds: BaseCron['id'][]) => Promise<Sequence | undefined>
    linkCron: (cronId: BaseCron['id'], sequencesIds: BaseSequence['id'][]) => Promise<Cron | undefined>

}

class CronSequenceLink implements CronSequenceLinkInterface {

    db: JSONDb<void, CronSequence>
    sequenceCRUD: SequenceCRUD
    cronCRUD: CronCRUD
    constructor(
        db: JSONDb<void, CronSequence>,
        sequenceCRUD: SequenceCRUD,
        cronCRUD: CronCRUD,
    ) {
        this.db = db
        this.sequenceCRUD = sequenceCRUD
        this.cronCRUD = cronCRUD
    }

    linkSequence = async (sequenceId: BaseSequence['id'], cronsIds: BaseCron['id'][]) => {
        const exists = this.sequenceCRUD.db.exists(sequenceId)
        if (!exists) return

        const existingCron = (await Promise.all(cronsIds.map(this.cronCRUD.db.findByKey))).filter(c => c) as BaseCron[]

        await this.db.deleteBy(cs => cs.sequenceId === sequenceId)

        for (const cron of existingCron) {
            await this.db.insert({
                cronId: cron.id,
                sequenceId
            })
        }

        return this.sequenceCRUD.get(sequenceId)

    }

    linkCron = async (cronId: BaseCron['id'], sequencesIds: BaseSequence['id'][]) => {

        const exists = this.cronCRUD.db.exists(cronId)
        if (!exists) return

        const existingSequences = (await Promise.all(sequencesIds.map(this.sequenceCRUD.db.findByKey))).filter(c => c) as BaseSequence[]

        await this.db.deleteBy(cs => cs.cronId === cronId)

        for (const sequence of existingSequences) {
            await this.db.insert({
                sequenceId: sequence.id,
                cronId
            })
        }

        return this.cronCRUD.get(cronId)
    }
}

export default CronSequenceLink
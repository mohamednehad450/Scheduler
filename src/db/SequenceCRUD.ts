
import EventEmitter from "events"
import JSONDb from "./JSONDb";
import { BaseCron, BaseSequence, BaseSequenceEvent, CronSequence, Sequence } from "./types";
import { CRUD } from "./misc";


class SequenceCRUD extends EventEmitter implements CRUD<Sequence['id'], Sequence> {

    db: JSONDb<BaseSequence['id'], BaseSequence>
    cronDb: JSONDb<BaseCron['id'], BaseCron>
    cronSequenceDb: JSONDb<void, CronSequence>

    constructor(
        db: JSONDb<BaseSequence['id'], BaseSequence>,
        cronDb: JSONDb<BaseCron['id'], BaseCron>,
        cronSequenceDb: JSONDb<void, CronSequence>

    ) {
        super()
        this.db = db
        this.cronDb = cronDb
        this.cronSequenceDb = cronSequenceDb
    }


    private getCrons = async (sequence: BaseSequence): Promise<Sequence> => {
        const cronsIds = await this.cronSequenceDb.findBy(cs => cs.sequenceId === sequence.id)
        const crons = await Promise.all(cronsIds.map(({ cronId }) => this.cronDb.findByKey(cronId)))

        return {
            ...sequence,
            crons: crons.filter(c => c) as BaseCron[]
        }
    }

    insert = async (arg: any) => {
        const base = await this.db.insert(arg)
        const results = await this.getCrons(base)
        this.emit("insert", results)
        return results
    }

    getBase = async (id: Sequence['id']) => {
        return await this.db.findByKey(id)
    }

    get = async (id: Sequence['id']) => {
        const base = await this.db.findByKey(id)
        if (!base) return
        return this.getCrons(base)
    }

    remove = async (id: Sequence['id']) => {
        if (!await this.db.exists(id)) return
        await this.db.deleteByKey(id)
        this.emit('remove', id)
    }

    list = async () => {
        const base = await this.db.findAll()
        return await Promise.all(base.map(this.getCrons))
    }

    update = async (id: Sequence['id'], arg: any) => {
        const base = await this.db.update(id, arg)
        if (!base) return
        const results = await this.getCrons(base)
        this.emit('update', results)
        return results
    }

    set = this.update
}

export default SequenceCRUD
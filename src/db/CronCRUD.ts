
import EventEmitter from "events"
import { BaseCron, BaseSequence, Cron, CronSequence } from "./types";
import JSONDb from "./JSONDb";
import { CRUD } from "./misc";


export default class CronCRUD extends EventEmitter implements CRUD<Cron['id'], Cron> {

    db: JSONDb<BaseCron['id'], BaseCron>
    sequenceDb: JSONDb<BaseSequence['id'], BaseSequence>
    cronSequenceDb: JSONDb<void, CronSequence>


    constructor(
        db: JSONDb<BaseCron['id'], BaseCron>,
        sequenceDb: JSONDb<BaseSequence['id'], BaseSequence>,
        cronSequenceDb: JSONDb<void, CronSequence>,
    ) {
        super()
        this.db = db
        this.sequenceDb = sequenceDb
        this.cronSequenceDb = cronSequenceDb

    }

    private getSequences = async (cron: BaseCron): Promise<Cron> => {
        const sequencesIds = await this.cronSequenceDb.findBy(cs => cs.cronId === cron.id)
        const sequences = (await Promise.all(sequencesIds.map(({ sequenceId }) => this.sequenceDb.findByKey(sequenceId))))
            .filter(s => s) as BaseSequence[]

        return {
            ...cron,
            sequences: sequences.map(({ id, name, active }) => ({ id, name, active }))
        }
    }

    insert = async (arg: any) => {
        const base = await this.db.insert(arg)
        const results = await this.getSequences(base)
        this.emit("insert", results)
        return results
    };


    getBase = async (key: BaseCron['id']) => {
        return await this.db.findByKey(key)
    }

    get = async (key: BaseCron['id']) => {
        const base = await this.db.findByKey(key)
        if (!base) return
        return this.getSequences(base)
    }

    remove = async (key: BaseCron['id']) => {
        if (!await this.db.exists(key)) return
        await this.db.deleteByKey(key)
        this.emit('remove', key)
    }

    list = async () => {
        const base = await this.db.findAll()
        return await Promise.all(base.map(this.getSequences))
    }

    set = async (id: BaseCron['id'], arg: any) => {
        const base = await this.db.update(id, arg)
        if (!base) return
        const results = await this.getSequences(base)
        this.emit('update', results)
        return results
    }

    update = this.set
}

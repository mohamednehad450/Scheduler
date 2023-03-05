import JSONDb from "./JSONDb"
import { Compare, EventCRUD, Pagination } from "./misc"
import { BaseSequence, BaseSequenceEvent, SequenceEvent } from "./types"


export default class SequenceEventCRUD implements EventCRUD<SequenceEvent['id'], SequenceEvent> {

    db: JSONDb<BaseSequenceEvent['id'], BaseSequenceEvent>
    sequenceDb: JSONDb<BaseSequence['id'], BaseSequence>


    constructor(
        db: JSONDb<BaseSequenceEvent['id'], BaseSequenceEvent>,
        sequenceDb: JSONDb<BaseSequence['id'], BaseSequence>
    ) {
        this.db = db
        this.sequenceDb = sequenceDb
    }

    private getSequence = async (event: BaseSequenceEvent): Promise<SequenceEvent> => {
        const seq = await this.sequenceDb.findByKey(event.sequenceId)
        return {
            ...event,
            sequence: { name: seq?.name || "Not found or removed." }
        }
    }


    emit = async (e: any) => {
        return this.getSequence(await this.db.insert(e))
    }


    get = async (key: BaseSequenceEvent['id']) => {
        const event = await this.db.findByKey(key)
        if (!event) return null
        return this.getSequence(event)
    }

    remove = (key: BaseSequenceEvent['id']) => this.db.deleteByKey(key)
    removeAll = () => this.db.deleteAll()
    removeByEmitter = (sequenceId: BaseSequence['id']) => this.db.deleteBy(e => e.sequenceId === sequenceId)

    listAll = async (pagination?: Pagination) => {
        const events = (await this.db.findAll({
            page: pagination?.page || 1,
            perPage: pagination?.perPage,
        }))
            .map(this.getSequence)
        return {
            events: await Promise.all(events),
            page: {
                current: pagination?.page || 1,
                perPage: pagination?.perPage || this.db.PER_PAGE,
                total: await this.db.count(),
            }
        }
    }

    listByEmitter = async (sequenceId: BaseSequence['id'], pagination?: Pagination) => {
        const events = (await this.db.findBy(
            (e => e.sequenceId === sequenceId),
            {
                page: pagination?.page || 1,
                perPage: pagination?.perPage,
            }
        ))
            .map(this.getSequence)
        return {
            events: await Promise.all(events),
            page: {
                current: pagination?.page || 1,
                perPage: pagination?.perPage || this.db.PER_PAGE,
                total: await this.db.countBy(e => e.sequenceId === sequenceId),
            }
        }
    }

    getCount = () => this.db.count()
    getCountByObject = async (sequenceId: BaseSequence['id']) => await this.db.countBy(e => e.sequenceId === sequenceId)
}
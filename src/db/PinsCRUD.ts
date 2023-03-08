
import EventEmitter from "events";
import JSONDb from "./JSONDb";
import { CRUD } from "./misc";
import SequenceCRUD from "./SequenceCRUD";
import { Pin } from "./types";

export default class PinCRUD extends EventEmitter implements CRUD<Pin['channel'], Pin> {

    db: JSONDb<Pin['channel'], Pin>
    sequenceCRUD: SequenceCRUD

    constructor(
        db: JSONDb<Pin['channel'], Pin>,
        sequenceCRUD: SequenceCRUD
    ) {
        super()
        this.db = db
        this.sequenceCRUD = sequenceCRUD
    }

    insert = async (obj: Pin) => {
        const results = await this.db.insert(obj)
        this.emit('insert', results)
        return results
    }
    update = async (id: Pin['channel'], obj: Partial<Pin>) => {
        const results = await this.db.update(id, obj)
        this.emit('update', results)
        return results
    }

    set = this.update
    remove = async (key: Pin['channel']) => {
        if (!await this.db.exists(key)) return
        await this.db.deleteByKey(key)
        this.emit('remove', key)
    }
    get = async (key: Pin['channel']) => this.db.findByKey(key)
    list = async () => this.db.findAll()
}


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

    insert = (obj: Pin) => this.db.insert(obj)
    update = async (id: Pin['channel'], obj: Partial<Pin>) => {
        return await this.db.update(id, obj)
    }

    set = this.update
    remove = async (key: Pin['channel']) => {
        return await this.db.deleteByKey(key)
    }
    get = (key: Pin['channel']) => this.db.findByKey(key)
    list = () => this.db.findAll()
}


import EventEmitter from "events";
import JSONDb from "./JSONDb";
import { CRUD } from "./misc";
import { Pin } from "./types";

export default class PinCRUD extends EventEmitter implements CRUD<Pin['channel'], Pin> {

    db: JSONDb<Pin['channel'], Pin>

    constructor(db: JSONDb<Pin['channel'], Pin>) {
        super()
        this.db = db
    }

    insert = (obj: Pin) => this.db.insert(obj)
    update = (id: Pin['channel'], obj: Partial<Pin>) => this.db.update(id, obj)
    set = this.update
    remove = (key: Pin['channel']) => this.db.deleteByKey(key)
    get = (key: Pin['channel']) => this.db.findByKey(key)
    list = () => this.db.findAll()
}


import EventEmitter from "events";
import JSONDb from "./JSONDb";
import { CRUD } from "./misc";
import SequenceCRUD from "./SequenceCRUD";
import { BaseSequence, Pin } from "./types";

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
        const newPin = await this.db.update(id, obj)
        if (!newPin) return

        if (id === newPin.channel) return newPin

        // Update changed channels
        await this.sequenceCRUD.db.updateBy(
            _ => true,
            sequence => ({
                ...sequence,
                orders: sequence.orders
                    .map(o =>
                        o.channel === id ?
                            ({ ...o, channel: newPin.channel }) :
                            o
                    )
            })
        )
        return newPin
    }

    set = this.update
    remove = async (key: Pin['channel']) => {
        await this.db.deleteByKey(key)
        const updated = await this.sequenceCRUD.db.updateBy(
            _ => true,
            s => ({ ...s, orders: s.orders.filter(o => o.channel !== key) })
        )
        await Promise.all(
            updated
                .filter(s => !s.orders.length)
                .map(s => this.sequenceCRUD.remove(s.id))
        )
    }
    get = (key: Pin['channel']) => this.db.findByKey(key)
    list = () => this.db.findAll()
}

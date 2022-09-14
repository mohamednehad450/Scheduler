import EventEmitter from "events"

interface DB<K, T> extends EventEmitter {
    insert: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | null>
    set: (id: K, obj: any) => Promise<T>
    remove: (id: K) => Promise<void>
    update: (id: K, obj: any,) => Promise<T>
    list: () => Promise<T[]>
}


interface EventsDB<K, T> {
    emit: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | null>
    remove: (id: K) => Promise<void>
    removeByObject: (objId: any) => Promise<void>
    removeAll: () => Promise<void>
    listAll: () => Promise<T[]>
    listByObject: (objId: any) => Promise<T[]>
}

export type { DB, EventsDB }
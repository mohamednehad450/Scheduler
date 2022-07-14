import EventEmitter from "events"

interface DB<K, T> extends EventEmitter {
    insert: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | null>
    set: (id: K, obj: any) => Promise<T>
    remove: (id: K) => Promise<void>
    update: (id: K, obj: any,) => Promise<T>
    list: () => Promise<T[]>
}

export type { DB }
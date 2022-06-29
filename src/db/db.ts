import EventEmitter from "events"

interface DB<K, T> extends EventEmitter {
    insert: (obj: Partial<T>) => Promise<T>
    get: (id: K,) => Promise<T | null>
    set: (id: K, obj: Partial<T>,) => Promise<T>
    remove: (id: K) => Promise<void>
    update: (id: K, obj: Partial<T>,) => Promise<T>
    list: () => Promise<T[]>
}

export { DB }
import EventEmitter from "events"

interface DB<K, T> extends EventEmitter {
    insert: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | null>
    set: (id: K, obj: any) => Promise<T | null>
    remove: (id: K) => Promise<void>
    update: (id: K, obj: any,) => Promise<T | null>
    list: () => Promise<T[]>
}

type Pagination = {
    current: number,
    total: number,
    perPage: number
}

type Page = {
    page: number,
    perPage?: number
}
interface EventsDB<K, T> {
    emit: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | null>
    remove: (id: K) => Promise<void>
    removeByObject: (objId: any) => Promise<boolean>
    removeAll: () => Promise<void>
    listAll: (page?: Page) => Promise<{ events: T[], page: Pagination }>
    listByObject: (objId: any, page?: Page) => Promise<{ events: T[], page: Pagination } | null>
}

export type { DB, EventsDB, Pagination, Page }
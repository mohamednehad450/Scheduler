import EventEmitter from "events"
import { ObjectSchema } from "joi"

type Predict<T> = (item: T) => boolean
type Compare<T> = (itemA: T, itemB: T) => number
type Updater<T> = (item: T) => T
type Pagination = {
    page?: number,
    perPage?: number,
    sort?: Compare<unknown>
}
type PageInfo = {
    total: number,
    current: number,
    perPage: number,
}
type ObjectValidators<T> = {
    loadValidator?: ObjectSchema<T>
    inputValidator?: ObjectSchema<T>
    updateValidator?: ObjectSchema<Partial<T>>
}


type ForeignDbLink<K, T, FK, FT> = {
    db: Db<FK, FT>,
    predict: Predict<{
        foreignItem: FT,
        key: K
        oldKey?: K
    }>
    onUpdate?: (foreignItem: FT, item: T, oldKey?: K) => FT
    onDelete?: "CASCADE" | ((ForeignItem: FT, key: K) => FT)
}


interface Db<K, T> {
    linkForeignDb: <FK, FT>(link: ForeignDbLink<K, T, FK, FT>) => void
    insert: (obj: T) => Promise<T>
    update: (id: K, obj: Partial<T>) => Promise<T | undefined>
    updateBy: (predict: Predict<T>, updater: Updater<T>) => Promise<T[]>
    findByKey: (key: K) => Promise<T | undefined>
    findBy: (predict: Predict<T>, page?: Pagination) => Promise<T[]>
    findAll: (page?: Pagination) => Promise<T[]>
    deleteBy: (predict: Predict<T>) => Promise<void>
    deleteByKey: (key: K) => Promise<void>
    deleteAll: () => Promise<void>
    count: () => Promise<number>
    countBy: (predict: Predict<T>) => Promise<number>
    exists: (key: K) => Promise<boolean>
}

interface CRUD<K, T> extends EventEmitter {
    insert: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | undefined>
    set: (id: K, obj: any) => Promise<T | undefined>
    update: (id: K, obj: any,) => Promise<T | undefined>
    remove: (id: K) => Promise<void>
    list: (pagination?: Pagination) => Promise<T[]>
}

interface EventCRUD<K, T> {
    emit: (obj: T) => Promise<T>
    get: (key: K) => Promise<T | null>
    remove: (key: K) => Promise<void>
    removeByEmitter: (emitterKey: any) => Promise<void>
    removeAll: () => Promise<void>
    listAll: (pagination?: Pagination) => Promise<{ events: T[], page: PageInfo }>
    listByEmitter: (emitterKey: any, pagination?: Pagination) => Promise<{ events: T[], page: PageInfo }>
}


export type {
    ObjectValidators,
    Predict,
    Compare,
    Pagination,
    PageInfo,
    Db,
    CRUD,
    EventCRUD,
    ForeignDbLink
}
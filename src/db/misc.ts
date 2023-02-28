import EventEmitter from "events"
import { ObjectSchema } from "joi"

type Predict<T> = (item: T) => boolean
type Compare<T> = (item: T) => number
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
    updateValidator?: ObjectSchema<T>
}


interface Db<K, T> {
    insert: (obj: T) => Promise<T>
    update: (id: K, obj: Partial<T>) => Promise<T | undefined>
    findByKey: (key: K) => Promise<T | undefined>
    findBy: (predict: Predict<T>, page?: Pagination) => Promise<T[]>
    findAll: (page?: Pagination) => Promise<T[]>
    deleteBy: (predict: Predict<T>) => Promise<void>
    deleteByKey: (key: K) => Promise<void>
    deleteAll: () => Promise<void>
    count: () => Promise<number>
    countBy: (predict: Predict<T>) => Promise<number>
}

interface DbSync<K, T> {
    insert: (obj: T) => T
    update: (id: K, obj: Partial<T>) => T | undefined
    findByKey: (key: K) => T | undefined
    findBy: (predict: Predict<T>, pagination?: Pagination) => T[]
    findAll: (pagination?: Pagination) => T[]
    deleteBy: (predict: Predict<T>) => void
    deleteByKey: (key: K) => void
    deleteAll: () => void
    count: () => number
    countBy: (predict: Predict<T>) => number
}

interface CRUD<K, T> extends EventEmitter {
    insert: (obj: any) => Promise<T>
    get: (id: K,) => Promise<T | undefined>
    set: (id: K, obj: any) => Promise<T | undefined>
    update: (id: K, obj: any,) => Promise<T | undefined>
    remove: (id: K) => Promise<void>
    list: (pagination?: Pagination) => Promise<T[]>
}

interface EventsCRUD<K, T> {
    emit: (obj: T) => Promise<T>
    get: (key: K) => Promise<T | null>
    remove: (key: K) => Promise<void>
    removeByEmitter: (emitterKey: any) => Promise<void>
    removeAll: () => Promise<void>
    listAll: (pagination?: Pagination) => Promise<{ events: T[], pageInfo: PageInfo }>
    listByEmitter: (emitterKey: any, pagination?: Pagination) => Promise<{ events: T[], pageInfo: PageInfo }>
}


export type {
    ObjectValidators,
    Predict,
    Compare,
    Pagination,
    PageInfo,
    Db,
    DbSync,
    CRUD,
    EventsCRUD,
}
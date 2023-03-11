import EventEmitter from "events"
import { ObjectSchema } from "joi"
import { existsSync, readFileSync } from "node:fs"

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
    db: DbInterface<FK, FT>,
    predict: Predict<{
        foreignItem: FT,
        key: K
        oldKey?: K
    }>
    onUpdate?: (foreignItem: FT, item: T, oldKey?: K) => FT
    onDelete?: "CASCADE" | ((ForeignItem: FT, key: K) => FT)
}



interface DbInterface<K, T> {
    setDefaultSort: (sort?: Compare<T>) => void
    linkForeignDb: <FK, FT>(link: ForeignDbLink<K, T, FK, FT>) => void
    addForeignKeyValidator: (validator: (item: T) => void) => void
    insert: (obj: T) => T
    update: (id: K, obj: Partial<T>) => T | undefined
    updateBy: (predict: Predict<T>, updater: Updater<T>) => T[]
    findByKey: (key: K) => T | undefined
    findBy: (predict: Predict<T>, page?: Pagination) => T[]
    findAll: (page?: Pagination) => T[]
    deleteBy: (predict: Predict<T>) => void
    deleteByKey: (key: K) => void
    deleteAll: () => void
    count: () => number
    countBy: (predict: Predict<T>) => number
    exists: (key: K) => boolean
}

interface DbEvents<K, T> {
    update: (item: T[]) => void
    insert: (item: T) => void
    remove: (key: K[]) => void
}
abstract class Db<K, T> extends EventEmitter {
    emit<E extends keyof DbEvents<K, T>>(event: E, ...args: Parameters<DbEvents<K, T>[E]>) {
        return super.emit(event, ...args);
    }

    on<E extends keyof DbEvents<K, T>>(
        event: E,
        listener: (...args: Parameters<DbEvents<K, T>[E]>) => void
    ) {
        return super.on(event, listener as any);
    }

    removeListener<E extends keyof DbEvents<K, T>>(
        event: E,
        listener: (...args: Parameters<DbEvents<K, T>[E]>) => void
    ) {
        return super.removeListener(event, listener as any)
    }

    addListener<E extends keyof DbEvents<K, T>>(
        event: E,
        listener: (...args: Parameters<DbEvents<K, T>[E]>) => void
    ) {
        return super.addListener(event, listener as any);
    }
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



const parseDbFile = <K, T>(file: string, keyExtractor: (item: T) => K, loadValidator?: ObjectSchema<T>): Map<K, T> => {

    if (!existsSync(file)) throw new Error(`File: ${file}, doesn't exists`)

    const content = readFileSync(file, 'utf-8')

    const arr = JSON.parse(content)
    if (!Array.isArray(arr)) throw Error('invalid JSONDb file')

    const map = new Map<K, T>()
    if (!loadValidator) {
        arr.map(item => map.set(keyExtractor(item), item))
        return map
    }

    // Load if valid
    for (const item of arr) {
        const { error, value } = loadValidator.validate(item)
        !error && value &&
            map.set(keyExtractor(value), value)
    }

    return map
}


export type {
    ObjectValidators,
    Predict,
    Compare,
    Pagination,
    PageInfo,
    DbInterface,
    DbEvents,
    EventCRUD,
    ForeignDbLink
}
export {
    Db,
    parseDbFile,
}
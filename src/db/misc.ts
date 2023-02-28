import { ObjectSchema } from "joi"

type Predict<T> = (item: T) => boolean
type Compare<T> = (item: T) => number
type Pagination = {
    page?: number,
    perPage?: number,
    sort?: Compare<unknown>
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

type ObjectValidators<T> = {
    loadValidator?: ObjectSchema<T>
    inputValidator?: ObjectSchema<T>
    updateValidator?: ObjectSchema<T>
}


export type {
    ObjectValidators,
    Predict,
    Compare,
    Pagination,
    Db,
}
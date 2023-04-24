import {
  existsSync,
  writeFileSync,
  renameSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import path from "path";
import { Db, parseDbFile } from "./misc";

import type {
  ForeignDbLink,
  ObjectValidators,
  Pagination,
  Predict,
  Compare,
} from "./misc";

export default class JSONDb<K, T> extends Db<K, T> {
  PER_PAGE = 20;
  dir: string;
  dbName: string;
  map: Map<K, T>;

  validators: ObjectValidators<T>;
  keyExtractor: (item: T) => K;

  foreignDbs: ForeignDbLink<K, T, any, any>[] = [];

  foreignKeysValidators: ((item: T) => void)[] = [];

  private defaultSort?: Compare<T>;

  private file: string;
  private backupFile: string;

  constructor(
    dir: string,
    dbName: string,
    validators: ObjectValidators<T>,
    keyExtractor: (item: T) => K
  ) {
    super();
    this.dir = dir;
    this.dbName = dbName;
    this.map = new Map();
    this.validators = validators;
    this.keyExtractor = keyExtractor;
    this.file = path.join(this.dir, `${this.dbName}.json`);
    this.backupFile = path.join(this.dir, `${this.dbName}-backup.json`);
  }

  init = () => {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir);
    }

    // Load main db file
    try {
      this.map = parseDbFile(
        this.file,
        this.keyExtractor,
        this.validators.loadValidator
      );
      existsSync(this.backupFile) && rmSync(this.backupFile);
      return;
    } catch (error) {
      console.log(`File: "${this.file}" is missing or invalid.`);
      console.error(error);
    }

    // Load backup db file if main failed
    try {
      this.map = parseDbFile(
        this.backupFile,
        this.keyExtractor,
        this.validators.loadValidator
      );
      existsSync(this.backupFile) && rmSync(this.backupFile);
      return;
    } catch (error) {
      console.log(`Backup file: "${this.backupFile}" is missing or invalid.`);
      console.error(error);
      console.log("Creating empty file");
      writeFileSync(this.file, "[]");
    }
  };

  private save = () => {
    renameSync(this.file, this.backupFile);
    writeFileSync(this.file, JSON.stringify(Array.from(this.map.values())));
    rmSync(this.backupFile);
  };

  private applyPagination = (list: T[], pagination?: Pagination): T[] => {
    if (!pagination)
      return this.defaultSort ? list.sort(this.defaultSort) : list;

    const { sort, page, perPage = this.PER_PAGE } = pagination;

    const results = list.sort(sort || this.defaultSort);

    if (!page) return results;

    return results.slice((page - 1) * perPage, page * perPage);
  };

  private foreignDbsUpdate = (updatedObject: T, oldKey?: K) => {
    this.foreignDbs.forEach(({ db: foreignDb, onUpdate, predict }) => {
      if (!onUpdate) return;
      foreignDb.updateBy(
        (foreignItem) =>
          predict({
            foreignItem,
            key: this.keyExtractor(updatedObject),
            oldKey,
          }),
        (foreignItem) => onUpdate(foreignItem, updatedObject, oldKey)
      );
    });
  };

  private foreignDbsDelete = (key: K) => {
    this.foreignDbs.forEach(({ db, onDelete, predict }) => {
      if (!onDelete) return;
      if (onDelete === "CASCADE") {
        return db.deleteBy((foreignItem) => predict({ foreignItem, key }));
      }
      return db.updateBy(
        (foreignItem) => predict({ foreignItem, key }),
        (foreignItem) => onDelete(foreignItem, key)
      );
    });
  };

  private validateForeignKeys = (item: T) => {
    this.foreignKeysValidators.forEach((v) => v(item));
    return item;
  };

  setDefaultSort = (sort?: Compare<T>) => {
    this.defaultSort = sort;
  };

  linkForeignDb = <FK, FT>(link: ForeignDbLink<K, T, FK, FT>) => {
    this.foreignDbs.push(link);
  };

  addForeignKeyValidator = (validator: (item: T) => void) => {
    this.foreignKeysValidators.push(validator);
  };

  insert = (arg: T) => {
    if (!this.validators.inputValidator) {
      if (this.map.has(this.keyExtractor(arg)))
        throw new Error("Object already exists.");

      this.map.set(this.keyExtractor(arg), this.validateForeignKeys(arg));
      this.save();
      return arg as T;
    }

    const { value, error } = this.validators.inputValidator.validate(arg);
    if (error || !value) throw error;

    if (this.map.has(this.keyExtractor(value)))
      throw new Error("Object already exists.");

    this.map.set(this.keyExtractor(value), this.validateForeignKeys(value));
    this.save();
    this.emit("insert", value);
    return value as T;
  };

  update = (key: K, arg: Partial<T>) => {
    if (!this.map.has(key)) return;

    const { value = arg, error } =
      this.validators.updateValidator?.validate(arg) || {};

    if (error) throw error;

    const updatedObject = { ...this.map.get(key), ...value } as T;

    // If key is updated, with an existing key
    if (
      key !== this.keyExtractor(updatedObject) &&
      this.map.has(this.keyExtractor(updatedObject))
    )
      throw new Error("Object Key already exists.");

    const oldKey = key !== this.keyExtractor(updatedObject) ? key : undefined;

    // If key is updated
    if (oldKey) this.map.delete(key);

    this.map.set(
      this.keyExtractor(updatedObject),
      this.validateForeignKeys(updatedObject)
    );

    this.foreignDbsUpdate(updatedObject, oldKey);

    this.save();
    this.emit("update", [updatedObject]);
    return updatedObject as T;
  };

  updateBy = (predict: Predict<T>, updater: (item: T) => T) => {
    const arr: T[] = [];
    for (const [key, val] of this.map) {
      if (!predict(val)) continue;

      const { value: updatedObject = updater(val) } =
        this.validators.loadValidator?.validate(updater(val)) || {};

      // If key is updated, with an existing key
      if (
        key !== this.keyExtractor(updatedObject) &&
        this.map.has(this.keyExtractor(updatedObject))
      )
        continue;

      const oldKey = key !== this.keyExtractor(updatedObject) ? key : undefined;

      // If key is updated
      if (oldKey) this.map.delete(key);

      this.foreignDbsUpdate(updatedObject, oldKey);

      this.map.set(
        this.keyExtractor(updatedObject),
        this.validateForeignKeys(updatedObject)
      );
      arr.push(updatedObject);
    }

    arr.length && this.save();
    arr.length && this.emit("update", arr);
    return arr;
  };

  findAll = (pagination?: Pagination) =>
    this.applyPagination(Array.from(this.map.values()), pagination);
  findBy = (predict: Predict<T>, pagination?: Pagination) =>
    this.applyPagination(
      Array.from(this.map.values()).filter(predict),
      pagination
    );
  findByKey = (key: K) => this.map.get(key);

  deleteByKey = (key: K) => {
    if (!this.map.has(key)) return;
    this.map.delete(key);
    this.foreignDbsDelete(key);
    this.save();
    this.emit("remove", [key]);
  };

  deleteBy = (predict: Predict<T>) => {
    let deleted: K[] = [];
    for (const [key, val] of this.map) {
      if (!predict(val)) continue;
      deleted.push(key);
      this.map.delete(key);
      this.foreignDbsDelete(key);
    }
    deleted.length && this.save();
    deleted.length && this.emit("remove", deleted);
  };

  deleteAll = () => {
    for (const key of this.map.keys()) {
      this.foreignDbsDelete(key);
    }
    const keys = Array.from(this.map.keys());
    this.map.clear();
    this.save();
    this.emit("remove", keys);
  };

  count = () => this.map.size;
  countBy = (predict: Predict<T>) =>
    Array.from(this.map.values()).filter(predict).length;
  exists = (key: K) => this.map.has(key);
}

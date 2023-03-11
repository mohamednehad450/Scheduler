import { hash } from "bcrypt"
import JSONDb from "./JSONDb"
import { Admin } from "./types"
import { UserSchema } from "./validators"


interface AdminInterface {
    register: (username: string, password: string) => Promise<Admin | void>
    isRegistered: () => boolean
    getAdmin: (username: string) => Admin | undefined
}


export default class AdminManager implements AdminInterface {

    db: JSONDb<Admin['username'], Admin>

    constructor(db: JSONDb<Admin['username'], Admin>) {
        this.db = db
    }

    isRegistered = () => {
        return !!this.db.count()
    }

    register = async (arg: any) => {
        if (this.isRegistered()) return

        const { error, value } = UserSchema.validate(arg)
        if (error) throw error

        return this.db.insert({
            username: value.username,
            password: await hash(value.password, 10)
        })
    }

    getAdmin = (username: string) => {
        if (!this.isRegistered()) return
        return this.db.findByKey(username)
    }
}

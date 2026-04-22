declare module "better-sqlite3" {
  interface Statement {
    all(...params: unknown[]): unknown[]
    get(...params: unknown[]): unknown
    run(...params: unknown[]): unknown
  }

  class Database {
    constructor(filename: string)
    exec(sql: string): this
    prepare(sql: string): Statement
  }

  export = Database
}

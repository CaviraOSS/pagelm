import sqlite3 from 'sqlite3'
import path from 'path'

class SQLiteDatabase {
    private db: sqlite3.Database

    constructor(dbPath: string) {
        this.db = new sqlite3.Database(dbPath)
    }

    async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err)
                else resolve(this)
            })
        })
    }

    async get(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err)
                else resolve(row)
            })
        })
    }

    async all(sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err)
                else resolve(rows || [])
            })
        })
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err)
                else resolve()
            })
        })
    }
}

const dbPath = path.join(process.cwd(), 'storage', 'database.sqlite')
export const sqlite = new SQLiteDatabase(dbPath)
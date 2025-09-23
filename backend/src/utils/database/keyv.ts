import Keyv from 'keyv'
import SQLite from '@keyv/sqlite'

const db = new Keyv({
  store: new SQLite({ uri: 'sqlite://storage/database.sqlite' })
})

export default db
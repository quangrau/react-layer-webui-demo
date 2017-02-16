import Dexie from 'dexie';

const db = new Dexie('tkn');
db.version(1).stores({
  users: 'id,name,image_url',
});

export default db;

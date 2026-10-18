import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const data = resolve('.data/mongo');
const cache = resolve('.cache/mongodb');
mkdirSync(data, { recursive: true });
mkdirSync(cache, { recursive: true });
const mongo = await MongoMemoryServer.create({ instance: { port: 27017, dbPath: data, storageEngine: 'wiredTiger' }, binary: { version: '7.0.15', downloadDir: cache } });
console.log(`Local MongoDB running at ${mongo.getUri()}`);
process.on('SIGINT', async () => { await mongo.stop({ doCleanup: false }); process.exit(0); });
process.on('SIGTERM', async () => { await mongo.stop({ doCleanup: false }); process.exit(0); });
setInterval(() => {}, 60_000);

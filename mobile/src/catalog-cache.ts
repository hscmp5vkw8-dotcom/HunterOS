import * as SQLite from 'expo-sqlite';
let db:Promise<SQLite.SQLiteDatabase>|undefined;
async function database(){return db??=SQLite.openDatabaseAsync('hunteros-catalog-v1.db').then(async d=>{await d.execAsync('CREATE TABLE IF NOT EXISTS catalog (id INTEGER PRIMARY KEY, json TEXT NOT NULL)');return d;});}
export async function readCatalogCache(){const d=await database();return (await d.getFirstAsync<{json:string}>('SELECT json FROM catalog WHERE id=1'))?.json||null;}
export async function writeCatalogCache(json:string){const d=await database();await d.runAsync('INSERT INTO catalog(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json',json);}

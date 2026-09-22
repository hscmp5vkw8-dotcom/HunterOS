import * as SQLite from 'expo-sqlite';
let db: Promise<SQLite.SQLiteDatabase> | null=null;
function database(){return db??=(async()=>{const d=await SQLite.openDatabaseAsync('hunteros-mobile-v1.db');await d.execAsync('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);');return d;})();}
export async function readSaved(): Promise<string|null>{const d=await database();const row=await d.getFirstAsync<{json:string}>('SELECT json FROM workspace WHERE id=1');return row?.json??null;}
export async function writeSaved(json:string){const d=await database();await d.runAsync('INSERT INTO workspace(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json',json);}

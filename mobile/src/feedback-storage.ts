import * as SQLite from 'expo-sqlite';
let db:Promise<SQLite.SQLiteDatabase>|null=null;
function database(){return db??=(async()=>{const d=await SQLite.openDatabaseAsync('hunteros-feedback-v1.db');await d.execAsync('CREATE TABLE IF NOT EXISTS feedback_journal (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);');return d;})().catch(error=>{db=null;throw error;});}
export async function readFeedbackSaved():Promise<string|null>{const d=await database();return (await d.getFirstAsync<{json:string}>('SELECT json FROM feedback_journal WHERE id=1'))?.json??null;}
export async function writeFeedbackSaved(json:string){const d=await database();await d.runAsync('INSERT INTO feedback_journal(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json',json);}

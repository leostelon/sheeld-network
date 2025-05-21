import { join } from "path";
import { Low, JSONFile } from "lowdb";
import { PORT } from "../constants.js";

// Use JSON file for storage
const file = `db/lowdb-${PORT}.json`;
const adapter = new JSONFile(file);
let dbInitialized = false;
export const db = new Low(adapter);

export async function writeData() {
    if (!dbInitialized) return;
    if (!db.data) {
        await db.read();
        db.data = { posts: [] };
    }
    await db.write();
}

export function readData(key) {
    if (!dbInitialized) return;
    return db.data[key];
}

export async function initializeDB() {
    await db.read();
    db.data = { posts: [] };
    await db.write();
    dbInitialized = true;
    console.log("LOWDB Initianalized");
}

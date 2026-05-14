import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
    connectionString:
        // process.env.NODE_ENV === "development"    
        // ? process.env.DEV_DATABASE_URL
        // : 
        process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export default pool;
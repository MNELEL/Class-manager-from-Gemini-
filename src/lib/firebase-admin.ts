// Safe mock file for browser build compatibility.
// Avoids importing server-side firebase-admin on the client.
export const db: any = {};
export const storage: any = {};

import oracledb from "oracledb";

import { getOracleConnection } from "../config/oracle.js";

export const OBJECT = { outFormat: oracledb.OUT_FORMAT_OBJECT };
export const numberOut = () => ({ type: oracledb.NUMBER, dir: oracledb.BIND_OUT });

// Para lecturas: abre una conexión y la cierra siempre.
export async function withConnection(work) {
    const connection = await getOracleConnection();
    try {
        return await work(connection);
    } finally {
        await connection.close();
    }
}

// Para escrituras: todo o nada. Hace commit si termina bien y rollback si falla.
export async function withTransaction(work) {
    const connection = await getOracleConnection();
    try {
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
    } finally {
        await connection.close();
    }
}

// Arma "COLUMNA = :campo, ..." solo con campos de la lista permitida.
export function buildSetClause(changes, columns) {
    const keys = Object.keys(changes).filter((key) => changes[key] !== undefined);
    if (keys.some((key) => !(key in columns))) {
        throw new Error("Campo no permitido en la actualización.");
    }
    return {
        clause: keys.map((key) => `${columns[key]} = :${key}`).join(", "),
        binds: Object.fromEntries(keys.map((key) => [key, changes[key]]))
    };
}

export function escapeLike(text) {
    return text.replace(/[\\%_]/g, "\\$&");
}

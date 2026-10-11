import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { closeOraclePool, initOraclePool } from "../config/oracle.js";
import { createUser, hasAdministrator } from "../services/users.service.js";

function askHidden(prompt) {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
        throw new Error("Ejecuta este comando en una terminal interactiva para ingresar la contraseña de forma oculta.");
    }

    stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();

    return new Promise((resolve, reject) => {
        let value = "";
        const onData = (chunk) => {
            for (const character of chunk) {
                if (character === "\u0003") {
                    stdin.removeListener("data", onData);
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdout.write("\n");
                    reject(new Error("Operación cancelada."));
                    return;
                }
                if (character === "\r" || character === "\n") {
                    stdin.removeListener("data", onData);
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdout.write("\n");
                    resolve(value);
                    return;
                }
                if (character === "\u007f" || character === "\b") {
                    value = value.slice(0, -1);
                    continue;
                }
                value += character;
            }
        };
        stdin.on("data", onData);
    });
}

const prompt = createInterface({ input: stdin, output: stdout });
let poolInitialized = false;

try {
    await initOraclePool();
    poolInitialized = true;

    if (await hasAdministrator()) {
        throw new Error("Ya hay al menos un administrador. Usa la pantalla de gestión para crear más.");
    }

    const firstName = (await prompt.question("Nombre: ")).trim();
    const lastName = (await prompt.question("Apellido: ")).trim();
    const email = (await prompt.question("Correo electrónico: ")).trim();
    prompt.close();

    const password = await askHidden("Contraseña (mínimo 8 caracteres, entrada oculta): ");
    const confirmation = await askHidden("Confirmar contraseña: ");
    if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");

    const administrator = await createUser({ firstName, lastName, email, password, role: "ADMINISTRADOR" });
    console.log(`Administrador inicial creado: ${administrator.email}`);
    console.log("Ya puedes iniciar sesión y dar de alta empleados/usuarios desde el panel de administración.");
} catch (error) {
    prompt.close();
    console.error("No se pudo crear el administrador inicial:", error.message);
    process.exitCode = 1;
} finally {
    if (poolInitialized) await closeOraclePool();
}

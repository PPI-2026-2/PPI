// Envío de correos. Variables de entorno (backend/.env):
//   SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (true solo para el puerto 465), SMTP_USER, SMTP_PASS, SMTP_FROM
// MAIL_ENABLED=false desactiva el correo por completo (los avisos dentro de la aplicación siguen funcionando).
// Si falta SMTP_HOST o el paquete "nodemailer" no está instalado, el correo NO se envía: se imprime en la consola
// del backend (modo simulado) para poder probar el flujo sin servidor de correo. Nunca lanza errores.
let transporterPromise;

// Tope diario de correos enviados por el servidor (por defecto 100) para no pasar el límite del proveedor
// (Gmail permite ~500/día). Al llegar al tope el correo se omite; el cliente igual ve el aviso en la aplicación.
let sentToday = { day: "", count: 0 };
function reserveDailySlot() {
    const day = new Date().toISOString().slice(0, 10);
    if (sentToday.day !== day) sentToday = { day, count: 0 };
    const limit = Number(process.env.MAIL_DAILY_LIMIT) || 100;
    if (sentToday.count >= limit) return false;
    sentToday.count += 1;
    return true;
}

async function getTransporter() {
    if (!process.env.SMTP_HOST) return null;
    transporterPromise ??= (async () => {
        try {
            const { default: nodemailer } = await import("nodemailer");
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
                auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 10000
            });
        } catch {
            console.warn("[correo] El paquete nodemailer no está instalado: ejecuta 'npm install nodemailer' en backend.");
            return null;
        }
    })();
    return transporterPromise;
}

// Devuelve { status: "sent" | "simulated" | "failed" | "limit" | "disabled", to }
export async function sendMail({ to, subject, text, html }) {
    if (String(process.env.MAIL_ENABLED).toLowerCase() === "false") return { status: "disabled", to };
    const transporter = await getTransporter();
    if (!transporter) {
        console.log(`[correo simulado] Para: ${to}\nAsunto: ${subject}\n${text}\n`);
        return { status: "simulated", to };
    }
    if (!reserveDailySlot()) return { status: "limit", to };
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || "StockPlan <no-reply@stockplan.local>",
            to,
            subject,
            text,
            html
        });
        return { status: "sent", to };
    } catch (error) {
        console.error("[correo] No se pudo enviar:", error.message);
        return { status: "failed", to };
    }
}

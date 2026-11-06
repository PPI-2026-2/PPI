import { formatMoney } from "./format.js";
import { sendMail } from "./mailer.service.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
));

function itemLines(order) {
    return order.items.map((item) => (
        `${item.productName}${item.sizeName ? ` (talla ${item.sizeName})` : ""}: ${item.confirmed} de ${item.requested} unidades`
    ));
}

// Correo al cliente cuando su pedido queda INCOMPLETO (con la observación) o COMPLETO (listo para reclamar).
export function sendOrderStatusEmail(order) {
    const greeting = `Hola ${order.customer},`;
    const lines = itemLines(order);
    let subject;
    let intro;
    let closing;

    if (order.status === "COMPLETO") {
        subject = `Tu pedido ${order.code} está listo para reclamar`;
        intro = `Tu pedido ${order.code} está completo y listo para reclamar en nuestra tienda local.`;
        closing = `Valor total a pagar: ${formatMoney(order.confirmedTotal)}.`;
    } else if (order.status === "INCOMPLETO") {
        subject = `Tu pedido ${order.code} está incompleto`;
        intro = `Tu pedido ${order.code} quedó incompleto.`;
        closing = `Motivo: ${order.incompleteReason || "Sin observación."}\nTe avisaremos por este medio cuando el inventario tenga los productos que faltan y el pedido esté completo.`;
    } else {
        return Promise.resolve({ status: "skipped", to: order.email });
    }

    const text = [greeting, "", intro, "", ...lines.map((line) => `- ${line}`), "", closing, "", "StockPlan"].join("\n");
    const html = `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(intro)}</p>
<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
<p>${escapeHtml(closing).replace(/\n/g, "<br>")}</p><p>StockPlan</p>`;
    return sendMail({ to: order.email, subject, text, html });
}

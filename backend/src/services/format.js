const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatMoney = (value) => money.format(Number(value) || 0);

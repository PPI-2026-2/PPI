import { AppError } from "../utils/app-error.js";
import { OBJECT, withConnection } from "../utils/db.js";
import { orderCode } from "./orders.service.js";

// Reglas de negocio de análisis (reposición, comportamiento, ventas y alertas).
// Todo se calcula aquí con los datos de la base (movimientos, inventario, recepciones y pedidos): no se guarda nada.
// Parámetros opcionales en backend/.env (los valores entre paréntesis son los que se usan si no se definen):
//   INSIGHTS_HISTORY_DAYS (90)      días de historial para el consumo diario
//   INSIGHTS_SAFETY_DAYS (2)        días extra de seguridad sobre el tiempo de entrega del proveedor
//   INSIGHTS_COVERAGE_DAYS (15)     días de ventas que se quiere cubrir después de que llegue el pedido
//   (el horizonte de previsión es 30, 60 o 90 días y se elige en pantalla: ?horizonte=)
//   ALERT_RECEPTION_DAYS (2)        recepción registrada sin confirmar
//   ALERT_UNVERIFIED_MINUTES (30)   pedido pendiente sin verificar (cuenta desde que termina el plazo de cancelación)
//   ORDER_UNCLAIMED_DAYS (4)        pedido completo sin reclamar (misma regla de Pedidos > Sin reclamar)
const PERIODS = [7, 30, 90];
const HORIZONS = [30, 60, 90];
const DEFAULT_HORIZON = 90;
const DAY_MS = 86400000;

function envNumber(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getSettings() {
    return {
        historyDays: envNumber("INSIGHTS_HISTORY_DAYS", 90),
        safetyDays: envNumber("INSIGHTS_SAFETY_DAYS", 2),
        coverageDays: envNumber("INSIGHTS_COVERAGE_DAYS", 15),
        receptionDays: envNumber("ALERT_RECEPTION_DAYS", 2),
        unverifiedMinutes: envNumber("ALERT_UNVERIFIED_MINUTES", 30),
        unclaimedDays: envNumber("ORDER_UNCLAIMED_DAYS", 4)
    };
}

export function parsePeriod(raw, fallback) {
    if (raw === undefined || raw === "") return fallback;
    const days = Number(raw);
    if (!PERIODS.includes(days)) throw new AppError(`El periodo debe ser uno de: ${PERIODS.join(", ")} días.`);
    return days;
}

export function parseHorizon(raw) {
    if (raw === undefined || raw === "") return DEFAULT_HORIZON;
    const days = Number(raw);
    if (!HORIZONS.includes(days)) throw new AppError(`El horizonte debe ser uno de: ${HORIZONS.join(", ")} días.`);
    return days;
}

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

// Últimos `days` días terminando hoy: [{ key, label, date }]
function buildDays(days, endDate = startOfDay(new Date())) {
    return Array.from({ length: days }, (_, index) => {
        const date = addDays(endDate, index - (days - 1));
        return { key: dayKey(date), label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`, date };
    });
}

const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
const pct = (current, previous) => (previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null);

// ---------- Datos base por referencia (producto + talla) ----------
async function loadReferences(connection, days) {
    const result = await connection.execute(
        `SELECT RF.ID_REFERENCIA_PK, P.ID_PRODUCTO_PK, P.NOMBRE_PRODUCTO, P.PRECIO, T.NOMBRE_TALLA,
                PV.ID_PROVEEDOR_PK, PV.NOMBRE_PROVEEDOR, PV.DIAS_ENTREGA,
                NVL(I.CANTIDAD_ACTUAL, 0) AS ACTUAL, NVL(I.CANTIDAD_RESERVADA, 0) AS RESERVADA, NVL(I.STOCK_MINIMO, 0) AS MINIMO,
                NVL((SELECT -SUM(M.CANTIDAD) FROM MOVIMIENTO_INVENTARIO M
                      WHERE M.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK AND M.TIPO = 'SALIDA_PEDIDO'
                        AND M.FECHA >= TRUNC(SYSDATE) - :windowOut), 0) AS SALIDAS,
                NVL((SELECT SUM(M.CANTIDAD) FROM MOVIMIENTO_INVENTARIO M
                      WHERE M.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK AND M.TIPO = 'ENTRADA_RECEPCION'
                        AND M.FECHA >= TRUNC(SYSDATE) - :windowIn), 0) AS ENTRADAS,
                (SELECT MAX(M.FECHA) FROM MOVIMIENTO_INVENTARIO M
                  WHERE M.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK AND M.TIPO = 'SALIDA_PEDIDO') AS ULTIMA_SALIDA,
                NVL((SELECT SUM(R.CANTIDAD_ACEPTADA) FROM RECEPCION R
                      WHERE R.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK AND R.ESTADO = 'REGISTRADA'), 0) AS EN_CAMINO,
                NVL((SELECT SUM(D.CANTIDAD_PEDIDO - D.CANTIDAD_DISPONIBLE) FROM DETALLE_PEDIDO D
                       JOIN PEDIDO PE ON PE.ID_PEDIDO_PK = D.ID_PEDIDO_FK
                      WHERE D.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK AND PE.ESTADO IN ('PENDIENTE', 'INCOMPLETO')), 0) AS DEMANDA_PENDIENTE
           FROM REFERENCIA_PRODUCTO RF
           JOIN PRODUCTOS P ON P.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
           JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
           JOIN PROVEEDOR PV ON PV.ID_PROVEEDOR_PK = P.ID_PROVEEDOR_FK
           LEFT JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = RF.ID_REFERENCIA_PK
          WHERE P.ESTADO = 'ACTIVO' AND RF.ESTADO = 'ACTIVO'
          ORDER BY P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA`,
        { windowOut: days - 1, windowIn: days - 1 },
        OBJECT
    );
    return result.rows;
}

// Regla de reposición para una referencia.
//   consumo diario  = salidas del periodo / días del periodo
//   disponible      = stock actual - reservado
//   proyectado      = disponible - pedidos aún sin confirmar + recepciones registradas sin confirmar
//   punto de reorden= el mayor entre el stock mínimo y consumo diario x (días de entrega + días de seguridad)
//   objetivo        = punto de reorden + consumo diario x días de cobertura
//   sugerido        = si proyectado <= punto de reorden: objetivo - proyectado (nunca negativo)
// Con `horizon` (previsión a 30/60/90 días) el sugerido pasa a ser lo necesario para cubrir ese horizonte:
//   demanda del horizonte = consumo diario x horizonte
//   sugerido              = consumo diario x el mayor entre horizonte y días de entrega + stock mínimo - proyectado (nunca negativo)
//   se agota             = hoy + disponible / consumo diario
//   pedir antes de        = fecha de agotamiento - días de entrega del proveedor (si ya pasó: pedir ya)
function analyze(row, days, settings, horizon = null) {
    const daily = row.SALIDAS / days;
    const available = row.ACTUAL - row.RESERVADA;
    const projected = available - row.DEMANDA_PENDIENTE + row.EN_CAMINO;
    const reorderPoint = Math.max(row.MINIMO, Math.ceil(daily * (row.DIAS_ENTREGA + settings.safetyDays)));
    const target = reorderPoint + Math.ceil(daily * settings.coverageDays);
    const horizonDemand = horizon ? Math.ceil(daily * horizon) : null;
    const suggested = horizon
        // Debe alcanzar al menos hasta que llegue un pedido hecho hoy.
        ? Math.max(0, Math.ceil(daily * Math.max(horizon, row.DIAS_ENTREGA)) + row.MINIMO - projected)
        : projected <= reorderPoint ? Math.max(0, target - projected) : 0;
    const stockoutIn = daily > 0 ? Math.floor(Math.max(0, available) / daily) : null;
    const orderIn = stockoutIn === null ? null : stockoutIn - row.DIAS_ENTREGA;
    const today = startOfDay(new Date());
    const coverageDays = daily > 0 ? round1(Math.max(0, available) / daily) : null;

    let urgency = "NORMAL";
    if (available <= 0 || (coverageDays !== null && coverageDays < row.DIAS_ENTREGA)) urgency = "CRITICA";
    else if (projected <= reorderPoint) urgency = "ALTA";

    return {
        referenceId: row.ID_REFERENCIA_PK,
        productId: row.ID_PRODUCTO_PK,
        productName: row.NOMBRE_PRODUCTO,
        sizeName: row.NOMBRE_TALLA,
        supplierId: row.ID_PROVEEDOR_PK,
        supplierName: row.NOMBRE_PROVEEDOR,
        leadDays: row.DIAS_ENTREGA,
        onHand: row.ACTUAL,
        reserved: row.RESERVADA,
        available,
        minimum: row.MINIMO,
        pendingDemand: row.DEMANDA_PENDIENTE,
        inTransit: row.EN_CAMINO,
        sold: row.SALIDAS,
        received: row.ENTRADAS,
        dailyUse: round2(daily),
        coverageDays,
        reorderPoint,
        targetStock: target,
        suggested,
        horizonDemand,
        stockoutInDays: stockoutIn,
        stockoutDate: stockoutIn === null ? null : dayKey(addDays(today, stockoutIn)),
        orderInDays: orderIn,
        orderByDate: orderIn === null ? null : dayKey(addDays(today, Math.max(0, orderIn))),
        urgency,
        noHistory: row.SALIDAS === 0,
        lastExit: row.ULTIMA_SALIDA
    };
}

const URGENCY_ORDER = { CRITICA: 0, ALTA: 1, NORMAL: 2 };

// ---------- Reposición ----------
export function getReplenishment({ days, horizon = DEFAULT_HORIZON } = {}) {
    const settings = getSettings();
    const period = days ?? settings.historyDays;
    return withConnection(async (connection) => {
        const rows = (await loadReferences(connection, period)).map((row) => analyze(row, period, settings, horizon));
        const needs = rows
            .filter((row) => row.urgency !== "NORMAL" || row.suggested > 0)
            .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || b.suggested - a.suggested || a.productName.localeCompare(b.productName));

        const bySupplier = new Map();
        for (const item of needs) {
            const entry = bySupplier.get(item.supplierId) ?? { supplierId: item.supplierId, name: item.supplierName, leadDays: item.leadDays, lines: 0, units: 0, critical: 0 };
            entry.lines += 1;
            entry.units += item.suggested;
            if (item.urgency === "CRITICA") entry.critical += 1;
            bySupplier.set(item.supplierId, entry);
        }
        const suppliers = [...bySupplier.values()].sort((a, b) => b.units - a.units);

        const byProduct = new Map();
        for (const item of needs) byProduct.set(item.productName, (byProduct.get(item.productName) ?? 0) + item.suggested);
        const topProducts = [...byProduct.entries()].map(([label, units]) => ({ label, units })).sort((a, b) => b.units - a.units).slice(0, 8);

        const distribution = { CRITICA: 0, ALTA: 0, NORMAL: 0 };
        for (const row of rows) distribution[row.urgency] += 1;
        const nextStockout = rows.filter((row) => row.stockoutInDays !== null).sort((a, b) => a.stockoutInDays - b.stockoutInDays)[0] ?? null;

        return {
            params: { days: period, horizon, safetyDays: settings.safetyDays, coverageDays: settings.coverageDays },
            kpis: {
                nextStockout: nextStockout ? { productName: nextStockout.productName, sizeName: nextStockout.sizeName, date: nextStockout.stockoutDate, inDays: nextStockout.stockoutInDays } : null,
                orderNow: needs.filter((item) => item.orderInDays !== null && item.orderInDays <= 0 && item.suggested > 0).length,
                references: rows.length,
                needAction: needs.length,
                critical: distribution.CRITICA,
                suggestedUnits: needs.reduce((sum, item) => sum + item.suggested, 0),
                topProduct: topProducts[0]?.label ?? null,
                topSupplier: suppliers[0]?.name ?? null
            },
            items: needs,
            suppliers,
            topProducts,
            distribution
        };
    });
}

// ---------- Comportamiento del inventario ----------
export function getBehavior({ days, horizon = DEFAULT_HORIZON } = {}) {
    const settings = getSettings();
    const period = days ?? settings.historyDays;
    return withConnection(async (connection) => {
        const references = (await loadReferences(connection, period)).map((row) => analyze(row, period, settings));
        const movementResult = await connection.execute(
            `SELECT TRUNC(M.FECHA) AS DIA, M.TIPO, SUM(ABS(M.CANTIDAD)) AS UNIDADES
               FROM MOVIMIENTO_INVENTARIO M
              WHERE M.FECHA >= TRUNC(SYSDATE) - :windowDays
              GROUP BY TRUNC(M.FECHA), M.TIPO`,
            { windowDays: period - 1 },
            OBJECT
        );

        const timeline = buildDays(period);
        const byDay = new Map(timeline.map((day) => [day.key, { entries: 0, exits: 0, adjustments: 0 }]));
        for (const row of movementResult.rows) {
            const bucket = byDay.get(dayKey(new Date(row.DIA)));
            if (!bucket) continue;
            if (row.TIPO === "ENTRADA_RECEPCION") bucket.entries += row.UNIDADES;
            else if (row.TIPO === "SALIDA_PEDIDO") bucket.exits += row.UNIDADES;
            else bucket.adjustments += row.UNIDADES;
        }
        const series = {
            labels: timeline.map((day) => day.label),
            entries: timeline.map((day) => byDay.get(day.key).entries),
            exits: timeline.map((day) => byDay.get(day.key).exits),
            adjustments: timeline.map((day) => byDay.get(day.key).adjustments)
        };

        // Por producto (suma de sus tallas).
        const products = new Map();
        for (const ref of references) {
            const entry = products.get(ref.productId) ?? { productId: ref.productId, name: ref.productName, stock: 0, available: 0, inTransit: 0, sold: 0, received: 0 };
            entry.stock += ref.onHand;
            entry.available += Math.max(0, ref.available);
            entry.inTransit += ref.inTransit;
            entry.sold += ref.sold;
            entry.received += ref.received;
            products.set(ref.productId, entry);
        }
        const productList = [...products.values()].map((entry) => ({
            ...entry,
            // Rotación: cuántas veces se vendió el stock actual en el periodo. Cobertura: días que alcanza el stock al ritmo actual.
            rotation: entry.stock > 0 ? round1(entry.sold / entry.stock) : null,
            coverageDays: entry.sold > 0 ? round1(entry.stock / (entry.sold / period)) : null
        }));
        // Cobertura: el stock disponible de cada producto baja al ritmo de venta actual hasta llegar a cero.
        const today = startOfDay(new Date());
        const forecastDays = Array.from({ length: horizon + 1 }, (_, index) => addDays(today, index));
        const selling = productList.filter((entry) => entry.sold > 0).sort((a, b) => b.sold - a.sold);
        const forecast = {
            horizon,
            labels: forecastDays.map((date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`),
            series: selling.slice(0, 3).map((entry) => {
                const daily = entry.sold / period;
                return { name: entry.name, values: forecastDays.map((_, index) => Math.max(0, round1(entry.available - daily * index))) };
            }),
            stockouts: selling
                .map((entry) => {
                    const daily = entry.sold / period;
                    // La primera talla que se agota decide: las demás tallas no la sustituyen.
                    const first = references
                        .filter((ref) => ref.productId === entry.productId && ref.stockoutInDays !== null)
                        .reduce((earliest, ref) => (ref.stockoutInDays < earliest.stockoutInDays ? ref : earliest));
                    const inDays = first.stockoutInDays;
                    return { name: entry.name, available: entry.available, inTransit: entry.inTransit, dailyUse: round2(daily), inDays, firstSize: first.sizeName, date: dayKey(addDays(today, inDays)), withinHorizon: inDays <= horizon };
                })
                .sort((a, b) => a.inDays - b.inDays)
        };
        const topMoved = [...productList].sort((a, b) => b.sold - a.sold).slice(0, 8);

        const stagnant = references
            .filter((ref) => ref.onHand > 0 && ref.sold === 0)
            .map((ref) => ({
                referenceId: ref.referenceId,
                productName: ref.productName,
                sizeName: ref.sizeName,
                onHand: ref.onHand,
                lastExit: ref.lastExit ?? null
            }))
            .sort((a, b) => b.onHand - a.onHand)
            .slice(0, 10);

        const levels = { OK: 0, BAJO: 0, AGOTADO: 0 };
        for (const ref of references) {
            if (ref.available <= 0) levels.AGOTADO += 1;
            else if (ref.available <= ref.minimum) levels.BAJO += 1;
            else levels.OK += 1;
        }
        const sum = (list) => list.reduce((total, value) => total + value, 0);
        return {
            params: { days: period, horizon },
            forecast,
            kpis: {
                atRisk: forecast.stockouts.filter((entry) => entry.withinHorizon).length,
                stockUnits: sum(references.map((ref) => ref.onHand)),
                reservedUnits: sum(references.map((ref) => ref.reserved)),
                entries: sum(series.entries),
                exits: sum(series.exits),
                adjustments: sum(series.adjustments),
                stagnantReferences: references.filter((ref) => ref.onHand > 0 && ref.sold === 0).length
            },
            series,
            topMoved,
            stagnant,
            levels,
            products: productList.sort((a, b) => b.sold - a.sold)
        };
    });
}

// ---------- Ventas y recomendaciones ----------
// "Venta" = unidad entregada al cliente (movimiento SALIDA_PEDIDO), al precio que quedó guardado en el pedido.
export function getSales({ days, horizon = DEFAULT_HORIZON } = {}) {
    const settings = getSettings();
    const period = days ?? settings.historyDays;
    return withConnection(async (connection) => {
        const references = (await loadReferences(connection, period)).map((row) => analyze(row, period, settings, horizon));
        const saleResult = await connection.execute(
            `SELECT TRUNC(M.FECHA) AS DIA, M.ID_REFERENCIA_FK, -M.CANTIDAD AS UNIDADES, D.PRECIO_UNITARIO AS PRECIO, D.ID_PEDIDO_FK,
                    P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA
               FROM MOVIMIENTO_INVENTARIO M
               JOIN DETALLE_PEDIDO D ON D.ID_DETALLE_PEDIDO_PK = M.ID_DETALLE_PEDIDO_FK
               JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = M.ID_REFERENCIA_FK
               JOIN PRODUCTOS P ON P.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
               JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
              WHERE M.TIPO = 'SALIDA_PEDIDO' AND M.FECHA >= TRUNC(SYSDATE) - :windowDays`,
            { windowDays: period * 2 - 1 },
            OBJECT
        );
        const unmetResult = await connection.execute(
            `SELECT TRUNC(PE.FECHA_PEDIDO) AS DIA, D.ID_REFERENCIA_FK, D.CANTIDAD_PEDIDO - D.CANTIDAD_DISPONIBLE AS FALTANTE,
                    P.NOMBRE_PRODUCTO, T.NOMBRE_TALLA
               FROM DETALLE_PEDIDO D
               JOIN PEDIDO PE ON PE.ID_PEDIDO_PK = D.ID_PEDIDO_FK
               JOIN REFERENCIA_PRODUCTO RF ON RF.ID_REFERENCIA_PK = D.ID_REFERENCIA_FK
               JOIN PRODUCTOS P ON P.ID_PRODUCTO_PK = RF.ID_PRODUCTO_FK
               JOIN TALLA T ON T.ID_TALLA_PK = RF.ID_TALLA_FK
              WHERE PE.ESTADO = 'INCOMPLETO' AND D.CANTIDAD_PEDIDO > D.CANTIDAD_DISPONIBLE
                AND PE.FECHA_PEDIDO >= TRUNC(SYSDATE) - :windowDays`,
            { windowDays: period * 2 - 1 },
            OBJECT
        );

        const today = startOfDay(new Date());
        const currentStart = addDays(today, -(period - 1)).getTime();
        const isCurrent = (date) => startOfDay(new Date(date)).getTime() >= currentStart;

        const timeline = buildDays(period);
        const previousTimeline = buildDays(period, addDays(today, -period));
        const current = { units: 0, revenue: 0, orders: new Set() };
        const previous = { units: 0, revenue: 0, orders: new Set() };
        const unitsByDay = new Map([...timeline, ...previousTimeline].map((day) => [day.key, 0]));
        const ordersByDay = new Map(timeline.map((day) => [day.key, new Set()]));
        const products = new Map();
        const sizes = new Map();

        for (const sale of saleResult.rows) {
            const key = dayKey(new Date(sale.DIA));
            unitsByDay.set(key, (unitsByDay.get(key) ?? 0) + sale.UNIDADES);
            const bucket = isCurrent(sale.DIA) ? current : previous;
            bucket.units += sale.UNIDADES;
            bucket.revenue += sale.UNIDADES * sale.PRECIO;
            bucket.orders.add(sale.ID_PEDIDO_FK);
            if (bucket === current) {
                ordersByDay.get(key)?.add(sale.ID_PEDIDO_FK);
                const product = products.get(sale.NOMBRE_PRODUCTO) ?? { name: sale.NOMBRE_PRODUCTO, units: 0, revenue: 0 };
                product.units += sale.UNIDADES;
                product.revenue += sale.UNIDADES * sale.PRECIO;
                products.set(sale.NOMBRE_PRODUCTO, product);
                sizes.set(sale.NOMBRE_TALLA, (sizes.get(sale.NOMBRE_TALLA) ?? 0) + sale.UNIDADES);
            }
        }

        const unmet = { current: 0, previous: 0 };
        const unmetByRef = new Map();
        for (const row of unmetResult.rows) {
            if (isCurrent(row.DIA)) {
                unmet.current += row.FALTANTE;
                const entry = unmetByRef.get(row.ID_REFERENCIA_FK) ?? { productName: row.NOMBRE_PRODUCTO, sizeName: row.NOMBRE_TALLA, units: 0 };
                entry.units += row.FALTANTE;
                unmetByRef.set(row.ID_REFERENCIA_FK, entry);
            } else {
                unmet.previous += row.FALTANTE;
            }
        }

        const ticket = (bucket) => (bucket.orders.size ? bucket.revenue / bucket.orders.size : 0);
        const stat = (currentValue, previousValue) => ({ value: Math.round(currentValue), previous: Math.round(previousValue), change: pct(currentValue, previousValue) });
        const totalUnits = current.units || 1;
        const productRanking = [...products.values()]
            .sort((a, b) => b.units - a.units)
            .map((product) => ({ ...product, share: Math.round((product.units / totalUnits) * 1000) / 10 }));
        const sizeRanking = [...sizes.entries()].map(([label, units]) => ({ label, units })).sort((a, b) => b.units - a.units).slice(0, 8);

        // Previsión de demanda: se mantiene el ritmo de venta del periodo analizado durante el horizonte.
        const dailyUnits = current.units / period;
        const dailyRevenue = current.revenue / period;
        const weeksBack = Math.min(12, Math.max(2, Math.floor((period * 2) / 7)));
        const weeksAhead = Math.ceil(horizon / 7);
        const weekLabel = (date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
        const weekly = { labels: [], history: [], projection: [] };
        for (let week = weeksBack - 1; week >= 0; week -= 1) {
            let units = 0;
            for (let offset = 0; offset < 7; offset += 1) units += unitsByDay.get(dayKey(addDays(today, -(week * 7 + offset)))) ?? 0;
            weekly.labels.push(weekLabel(addDays(today, -week * 7)));
            weekly.history.push(units);
            weekly.projection.push(week === 0 ? units : null);
        }
        for (let week = 1; week <= weeksAhead; week += 1) {
            weekly.labels.push(weekLabel(addDays(today, week * 7)));
            weekly.history.push(null);
            weekly.projection.push(Math.round(dailyUnits * 7));
        }
        const byProduct = new Map();
        for (const ref of references) {
            const entry = byProduct.get(ref.productName) ?? { name: ref.productName, sold: 0, available: 0, inTransit: 0, suggested: 0 };
            entry.sold += ref.sold;
            entry.available += Math.max(0, ref.available);
            entry.inTransit += ref.inTransit;
            entry.suggested += ref.suggested;
            byProduct.set(ref.productName, entry);
        }
        const productForecast = [...byProduct.values()]
            .filter((entry) => entry.sold > 0)
            .map((entry) => {
                const projectedUnits = Math.ceil((entry.sold / period) * horizon);
                return { name: entry.name, dailyUnits: round2(entry.sold / period), projectedUnits, available: entry.available, inTransit: entry.inTransit, missing: entry.suggested };
            })
            .sort((a, b) => b.projectedUnits - a.projectedUnits)
            .slice(0, 10);

        const formatDay = (key) => key.split("-").reverse().join("/");
        // Recomendaciones de compra para el horizonte elegido, basadas en la demanda real.
        const recommendations = [];
        for (const ref of references.filter((item) => item.sold > 0 && item.suggested > 0).sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || b.suggested - a.suggested).slice(0, 6)) {
            const when = ref.orderInDays <= 0 ? "pídelo ya" : `pídelo antes del ${formatDay(ref.orderByDate)}`;
            recommendations.push({
                type: "REPONER",
                title: `Pedir ${ref.suggested} u. de ${ref.productName} talla ${ref.sizeName}`,
                detail: `A ${String(ref.dailyUse).replace(".", ",")} u./día se venderán ~${ref.horizonDemand} u. en ${horizon} días y tienes ${ref.available} disponibles${ref.inTransit ? ` (+${ref.inTransit} en camino)` : ""}. Se agota hacia el ${formatDay(ref.stockoutDate)}; el proveedor tarda ${ref.leadDays} días, ${when}.`,
                path: "/administrador/reposicion"
            });
        }
        for (const entry of [...unmetByRef.values()].sort((a, b) => b.units - a.units).slice(0, 4)) {
            recommendations.push({
                type: "DEMANDA",
                title: `Demanda no atendida: ${entry.productName} talla ${entry.sizeName}`,
                detail: `Clientes pidieron ${entry.units} u. que no se pudieron confirmar en tienda. Considera comprar más para no perder pedidos.`,
                path: "/administrador/pedidos"
            });
        }
        const overstock = references.filter((item) => item.onHand > 0 && (item.sold === 0 || (item.coverageDays !== null && item.coverageDays > horizon * 1.5)));
        for (const ref of overstock.sort((a, b) => b.onHand - a.onHand).slice(0, 4)) {
            recommendations.push({
                type: "EVITAR",
                title: ref.sold === 0 ? `Sin ventas: ${ref.productName} talla ${ref.sizeName}` : `Stock de sobra: ${ref.productName} talla ${ref.sizeName}`,
                detail: ref.sold === 0
                    ? `Tiene ${ref.onHand} u. en stock y no se vendió ninguna en ${period} días. No compres más en los próximos ${horizon} días.`
                    : `Tiene ${ref.onHand} u. y al ritmo actual alcanzan ${ref.coverageDays} días, más de lo que dura el horizonte (${horizon}). No compres más por ahora.`,
                path: "/administrador/comportamiento"
            });
        }

        return {
            params: { days: period, horizon },
            forecast: {
                horizon,
                dailyUnits: round2(dailyUnits),
                units: Math.ceil(dailyUnits * horizon),
                revenue: Math.round(dailyRevenue * horizon),
                weekly,
                products: productForecast
            },
            stats: {
                units: stat(current.units, previous.units),
                revenue: stat(current.revenue, previous.revenue),
                orders: stat(current.orders.size, previous.orders.size),
                ticket: stat(ticket(current), ticket(previous)),
                unmet: stat(unmet.current, unmet.previous)
            },
            daily: {
                labels: timeline.map((day) => day.label),
                current: timeline.map((day) => unitsByDay.get(day.key) ?? 0),
                previous: previousTimeline.map((day) => unitsByDay.get(day.key) ?? 0),
                previousLabels: previousTimeline.map((day) => day.label),
                orders: timeline.map((day) => ordersByDay.get(day.key)?.size ?? 0)
            },
            products: productRanking.slice(0, 10),
            sizes: sizeRanking,
            recommendations
        };
    });
}

// ---------- Alertas y notificaciones ----------
const SEVERITY_ORDER = { CRITICA: 0, ALTA: 1, MEDIA: 2, INFO: 3 };
const sample = (list, formatter) => list.slice(0, 4).map(formatter).join(", ") + (list.length > 4 ? ` y ${list.length - 4} más` : "");
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

export function getAlerts() {
    const settings = getSettings();
    return withConnection(async (connection) => {
        const references = (await loadReferences(connection, settings.historyDays)).map((row) => analyze(row, settings.historyDays, settings));
        const alerts = [];

        const soldOut = references.filter((ref) => ref.available <= 0);
        if (soldOut.length) {
            alerts.push({
                id: "sold-out", severity: "CRITICA", type: "INVENTARIO", count: soldOut.length,
                title: `${plural(soldOut.length, "referencia agotada", "referencias agotadas")}`,
                detail: `Sin unidades disponibles: ${sample(soldOut, (ref) => `${ref.productName} ${ref.sizeName}`)}.`,
                path: "/administrador/inventario"
            });
        }
        const reorder = references.filter((ref) => ref.available > 0 && ref.urgency !== "NORMAL");
        if (reorder.length) {
            alerts.push({
                id: "reorder", severity: reorder.some((ref) => ref.urgency === "CRITICA") ? "ALTA" : "MEDIA", type: "REPOSICION", count: reorder.length,
                title: `${plural(reorder.length, "referencia", "referencias")} por reponer`,
                detail: `Llegaron al punto de reorden: ${sample(reorder, (ref) => `${ref.productName} ${ref.sizeName}`)}.`,
                path: "/administrador/reposicion"
            });
        }

        const receptionResult = await connection.execute(
            `SELECT R.ID_RECEPCION_PK FROM RECEPCION R WHERE R.ESTADO = 'REGISTRADA' AND R.FECHA_INGRESO < SYSDATE - :limitDays`,
            { limitDays: settings.receptionDays },
            OBJECT
        );
        if (receptionResult.rows.length) {
            alerts.push({
                id: "receptions", severity: "MEDIA", type: "RECEPCIONES", count: receptionResult.rows.length,
                title: `${plural(receptionResult.rows.length, "recepción", "recepciones")} sin confirmar`,
                detail: `Llevan más de ${settings.receptionDays} días registradas y el stock no sube hasta confirmarlas.`,
                path: "/administrador/recepciones"
            });
        }

        const cancelWindow = envNumber("ORDER_CANCEL_WINDOW_MINUTES", 15);
        const pendingResult = await connection.execute(
            `SELECT P.ID_PEDIDO_PK FROM PEDIDO P
              WHERE P.ESTADO = 'PENDIENTE' AND P.FECHA_PEDIDO < SYSDATE - (:limitMinutes / 1440)`,
            { limitMinutes: cancelWindow + settings.unverifiedMinutes },
            OBJECT
        );
        if (pendingResult.rows.length) {
            alerts.push({
                id: "unverified", severity: "ALTA", type: "PEDIDOS", count: pendingResult.rows.length,
                title: `${plural(pendingResult.rows.length, "pedido", "pedidos")} sin verificar`,
                detail: `Terminó el plazo de cancelación hace más de ${settings.unverifiedMinutes} minutos y la tienda aún no los verifica: ${sample(pendingResult.rows, (row) => orderCode(row.ID_PEDIDO_PK))}.`,
                path: "/administrador/pedidos"
            });
        }

        const incompleteResult = await connection.execute(
            `SELECT PE.ID_PEDIDO_PK, D.CANTIDAD_PEDIDO - D.CANTIDAD_DISPONIBLE AS FALTANTE,
                    NVL(I.CANTIDAD_ACTUAL, 0) - NVL(I.CANTIDAD_RESERVADA, 0) AS LIBRE
               FROM PEDIDO PE
               JOIN DETALLE_PEDIDO D ON D.ID_PEDIDO_FK = PE.ID_PEDIDO_PK
               LEFT JOIN INVENTARIO I ON I.ID_REFERENCIA_FK = D.ID_REFERENCIA_FK
              WHERE PE.ESTADO = 'INCOMPLETO'`,
            {},
            OBJECT
        );
        const incompleteOrders = new Map();
        for (const row of incompleteResult.rows) {
            const entry = incompleteOrders.get(row.ID_PEDIDO_PK) ?? { canComplete: true };
            if (row.FALTANTE > 0 && row.LIBRE < row.FALTANTE) entry.canComplete = false;
            incompleteOrders.set(row.ID_PEDIDO_PK, entry);
        }
        const ready = [...incompleteOrders.entries()].filter(([, entry]) => entry.canComplete).map(([id]) => id);
        if (ready.length) {
            alerts.push({
                id: "can-complete", severity: "ALTA", type: "PEDIDOS", count: ready.length,
                title: `${plural(ready.length, "pedido incompleto", "pedidos incompletos")} ya se puede completar`,
                detail: `Ya hay stock libre para lo que faltaba: ${sample(ready, orderCode)}. Pide al personal que los verifique de nuevo para avisar al cliente.`,
                path: "/administrador/pedidos"
            });
        }

        const unclaimedResult = await connection.execute(
            `SELECT P.ID_PEDIDO_PK FROM PEDIDO P
              WHERE P.ESTADO = 'COMPLETO'
                AND (SELECT MAX(H.FECHA) FROM PROCESO_PEDIDO H WHERE H.ID_PEDIDO_FK = P.ID_PEDIDO_PK AND H.ESTADO = 'COMPLETO') < SYSDATE - :limitDays`,
            { limitDays: settings.unclaimedDays },
            OBJECT
        );
        if (unclaimedResult.rows.length) {
            alerts.push({
                id: "unclaimed", severity: "MEDIA", type: "PEDIDOS", count: unclaimedResult.rows.length,
                title: `${plural(unclaimedResult.rows.length, "pedido completo", "pedidos completos")} sin reclamar`,
                detail: `Llevan más de ${settings.unclaimedDays} días listos y mantienen stock reservado: ${sample(unclaimedResult.rows, (row) => orderCode(row.ID_PEDIDO_PK))}.`,
                path: "/administrador/pedidos?vista=sin-reclamar"
            });
        }

        const stagnant = references.filter((ref) => ref.onHand > 0 && ref.sold === 0);
        if (stagnant.length) {
            alerts.push({
                id: "stagnant", severity: "INFO", type: "INVENTARIO", count: stagnant.length,
                title: `${plural(stagnant.length, "referencia", "referencias")} sin ventas en ${settings.historyDays} días`,
                detail: `Tienen stock pero no rotan: ${sample(stagnant, (ref) => `${ref.productName} ${ref.sizeName}`)}.`,
                path: "/administrador/comportamiento"
            });
        }

        alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
        return {
            alerts,
            counts: {
                total: alerts.length,
                critical: alerts.filter((alert) => alert.severity === "CRITICA").length,
                high: alerts.filter((alert) => alert.severity === "ALTA").length
            }
        };
    });
}

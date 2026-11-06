import * as service from "../services/movements.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireId, requireInt, requireOneOf } from "../utils/validators.js";

const TYPES = ["ENTRADA_RECEPCION", "SALIDA_PEDIDO", "AJUSTE"];

export const getMovements = asyncHandler(async (req, res) => {
    const type = req.query.tipo ? requireOneOf(req.query.tipo, "El tipo", TYPES) : undefined;
    const productId = req.query.productId ? requireId(req.query.productId, "El producto") : undefined;
    const referenceId = req.query.referenceId ? requireId(req.query.referenceId, "La referencia") : undefined;
    const limit = req.query.limit ? requireInt(req.query.limit, "El límite", { min: 1, max: 500 }) : 100;
    const page = req.query.pagina ? requireInt(req.query.pagina, "La página", { min: 1, max: 1000000 }) : undefined;
    const pageSize = req.query.tamano ? requireInt(req.query.tamano, "El tamaño de página", { min: 1, max: 200 }) : 100;
    res.status(200).json(await service.listMovements({ type, productId, referenceId, limit, page, pageSize }));
});

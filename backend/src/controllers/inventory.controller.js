import * as service from "../services/inventory.service.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { optionalString, requireId, requireInt, requireOneOf, requireString } from "../utils/validators.js";

const LEVELS = ["OK", "BAJO", "AGOTADO"];

export const getInventory = asyncHandler(async (req, res) => {
    const search = optionalString(req.query.q, "La búsqueda", { max: 100 }) ?? undefined;
    const productId = req.query.productId ? requireId(req.query.productId, "El producto") : undefined;
    const level = req.query.nivel ? requireOneOf(req.query.nivel, "El nivel", LEVELS) : undefined;
    res.status(200).json(await service.listInventory({ search, productId, level }));
});

export const setInventoryMinimum = asyncHandler(async (req, res) => {
    const referenceId = requireId(req.params.referenceId, "La referencia");
    const minimum = requireInt(req.body?.minimum, "El stock mínimo", { min: 0, max: 1000000 });
    res.status(200).json({ item: await service.setMinimum(referenceId, minimum) });
});

export const adjustInventory = asyncHandler(async (req, res) => {
    const referenceId = requireId(req.params.referenceId, "La referencia");
    const body = req.body ?? {};
    const quantity = requireInt(body.quantity, "La cantidad del ajuste", { min: -1000000, max: 1000000 });
    if (quantity === 0) throw new AppError("La cantidad del ajuste no puede ser 0.");
    const observation = requireString(body.observation, "El motivo del ajuste", { max: 500 });
    const item = await service.adjustStock(referenceId, quantity, observation, requireId(req.auth.sub, "El usuario"));
    res.status(200).json({ item });
});

import * as service from "../services/sizes.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireString } from "../utils/validators.js";

export const getSizes = asyncHandler(async (_req, res) => {
    res.status(200).json({ sizes: await service.listSizes() });
});

export const createSize = asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, "El nombre de la talla", { max: 20 });
    res.status(201).json({ size: await service.createSize(name) });
});

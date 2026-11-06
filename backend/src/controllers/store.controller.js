import * as service from "../services/store.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireId } from "../utils/validators.js";

export const getStoreProducts = asyncHandler(async (_req, res) => {
    res.status(200).json({ products: await service.listStoreProducts() });
});

export const getStoreProduct = asyncHandler(async (req, res) => {
    const id = requireId(req.params.id, "El producto");
    res.status(200).json({ product: await service.getStoreProduct(id) });
});

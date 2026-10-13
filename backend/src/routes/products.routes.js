import { Router } from "express";

import {
    addProductSize,
    createProduct,
    getProduct,
    getProducts,
    setProductSizeStatus,
    setProductStatus,
    updateProduct
} from "../controllers/products.controller.js";

const productsRouter = Router();

productsRouter.get("/", getProducts);
productsRouter.get("/:id", getProduct);
productsRouter.post("/", createProduct);
productsRouter.patch("/:id", updateProduct);
productsRouter.patch("/:id/estado", setProductStatus);
productsRouter.post("/:id/tallas", addProductSize);
productsRouter.patch("/:id/tallas/:referenceId/estado", setProductSizeStatus);

export default productsRouter;

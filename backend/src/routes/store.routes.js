import { Router } from "express";

import { getStoreProduct, getStoreProducts } from "../controllers/store.controller.js";

// Rutas públicas de la tienda: solo lectura, sin sesión.
const storeRouter = Router();

storeRouter.get("/productos", getStoreProducts);
storeRouter.get("/productos/:id", getStoreProduct);

export default storeRouter;

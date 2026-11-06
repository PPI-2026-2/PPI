import * as service from "../services/insights.service.js";
import { asyncHandler } from "../utils/async-handler.js";

const periodOf = (req) => service.parsePeriod(req.query.dias, undefined);
const horizonOf = (req) => service.parseHorizon(req.query.horizonte);

export const getReplenishment = asyncHandler(async (req, res) => {
    res.status(200).json(await service.getReplenishment({ days: periodOf(req), horizon: horizonOf(req) }));
});
export const getBehavior = asyncHandler(async (req, res) => {
    res.status(200).json(await service.getBehavior({ days: periodOf(req), horizon: horizonOf(req) }));
});
export const getSales = asyncHandler(async (req, res) => {
    res.status(200).json(await service.getSales({ days: periodOf(req), horizon: horizonOf(req) }));
});
export const getAlerts = asyncHandler(async (_req, res) => {
    res.status(200).json(await service.getAlerts());
});

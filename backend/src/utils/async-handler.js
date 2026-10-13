// Express 4 no captura los errores de funciones async: este envoltorio los manda a next().
export const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

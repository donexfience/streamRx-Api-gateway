"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerMiddleware = void 0;
const logger_1 = require("../utils/logger");
const loggerMiddleware = (req, res, next) => {
    const start = Date.now();
    logger_1.logger.info(`${req.method} ${req.url}`, {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query
    });
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.info(`${req.method} ${req.url} - ${res.statusCode}`, {
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });
    next();
};
exports.loggerMiddleware = loggerMiddleware;

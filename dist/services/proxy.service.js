"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyService = void 0;
const http_proxy_middleware_1 = require("http-proxy-middleware");
const logger_1 = require("../utils/logger");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
class ProxyService {
    constructor(app, services) {
        this.app = app;
        this.services = services;
    }
    setupProxyRoutes() {
        this.services.forEach((service) => {
            const limiter = (0, express_rate_limit_1.default)({
                windowMs: 15 * 60 * 1000,
                max: 100,
                message: "Too many requests from this IP, please try again later.",
            });
            const proxyOptions = {
                target: service.url,
                changeOrigin: true,
                pathRewrite: {
                    [`^${service.path}`]: "",
                },
                timeout: service.timeout || 5000,
                on: {
                    proxyReq: (proxyReq, req, res) => {
                        logger_1.logger.info(`Proxying ${req.method} ${req.url} to ${service.name}`);
                    },
                    proxyRes: (proxyRes, req, res) => {
                        logger_1.logger.debug(`${service.name} responded with status ${proxyRes.statusCode}`);
                    },
                    error: (err, req, res) => {
                        logger_1.logger.error(`Proxy error for ${service.name}: ${err.message}`, {
                            service: service.name,
                            url: req.url,
                            method: req.method,
                        });
                        // Send error response to client
                        res.status(500).json({
                            error: "Service Unavailable",
                            message: `${service.name} is not responding`,
                            details: err.message,
                        });
                    },
                },
            };
            this.app.use(service.path, limiter, (0, http_proxy_middleware_1.createProxyMiddleware)(proxyOptions));
        });
    }
}
exports.ProxyService = ProxyService;

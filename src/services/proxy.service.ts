import { AuthMiddleware } from "./../middleware/authMiddleware";
import path from "path";
import { Application } from "express";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { logger } from "../utils/logger";
import { ServiceConfig } from "../config/service";
import { createRateLimiter } from "../rateLimit/rateLimit.middleware";
import url from "url";
import { TokenManager } from "../utils/TokenManager";
import express from "express";

export class ProxyService {
  private app: Application;
  private services: ServiceConfig[];
  private tokenManager: TokenManager;
  private authMiddleware: AuthMiddleware;

  constructor(app: Application, services: ServiceConfig[]) {
    this.app = app;
    this.services = services;
    this.tokenManager = new TokenManager(
      process.env.JWT_SECRET_KEY as string,
      process.env.JWT_REFRESH_SECRET_KEY as string
    );
    this.authMiddleware = new AuthMiddleware(this.tokenManager);
  }

  setupProxyRoutes() {
    const sortedServices = [...this.services].sort(
      (a, b) => b.path.length - a.path.length
    );

    sortedServices.forEach((service) => {
      const limiter = createRateLimiter();
      const parsedUrl = url.parse(service.url);

      logger.debug("Configuring service:", {
        name: service.name,
        parsedUrl,
        originalUrl: service.url,
      });

      const targetHost = `${parsedUrl.protocol}//${parsedUrl.host}`;

      const proxyOptions: Options = {
        target: targetHost,
        changeOrigin: true,
        secure: false,

        on: {
          proxyReq: (proxyReq, req: any, res) => {
            const fullUrl = `${targetHost}${proxyReq.path}`;
            
            // Set headers for all requests
            proxyReq.setHeader('Content-Type', 'application/json');
            
            if (req.body && Object.keys(req.body).length > 0) {
              const bodyData = JSON.stringify(req.body);
              // Set content length
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              // Write body data
              proxyReq.write(bodyData);
              
              logger.debug("Full proxy request details:", {
                service: service.name,
                method: req.method,
                originalUrl: req.url,
                proxyPath: proxyReq.path,
                fullUrl,
                headers: proxyReq.getHeaders(),
                body: req.body,
              });
            }

            fetch(fullUrl, { method: "OPTIONS" })
              .then(() => logger.debug(`Connection test successful to ${fullUrl}`))
              .catch((err) => logger.error(`Connection test failed to ${fullUrl}:`, err));
          },

          proxyRes: (proxyRes, req, res) => {
            const responseBody: any[] = [];

            proxyRes.on("data", (chunk) => {
              responseBody.push(chunk);
            });

            proxyRes.on("end", () => {
              const body = Buffer.concat(responseBody).toString();
              logger.debug("Proxy response details:", {
                service: service.name,
                status: proxyRes.statusCode,
                headers: proxyRes.headers,
                body: body.substring(0, 200) + (body.length > 200 ? "..." : ""),
                originalUrl: req.url,
              });
            });
          },

          error: (err, req, res: any) => {
            logger.error("Proxy error details:", {
              service: service.name,
              error: err.message,
              stack: err.stack,
              url: req.url,
              method: req.method,
              targetUrl: `${targetHost}${req.url}`,
            });

            if (!res.headersSent) {
              res.status(502).json({
                error: "Bad Gateway",
                message: `Unable to proxy request to ${service.name}`,
                details: err.message,
                targetUrl: `${targetHost}${req.url}`,
              });
            }
          },
        },
      };

      const routePaths = [service.path, `${service.path}/*`];

      logger.info("Setting up proxy routes:", {
        service: service.name,
        paths: routePaths,
        target: targetHost,
        fullServiceUrl: service.url,
      });

      this.app.use(
        routePaths,
        express.json(),
        express.urlencoded({ extended: true }),
        // this.authMiddleware.authenticate,
        limiter,
        createProxyMiddleware(proxyOptions)
      );
    });

    this.app.use("*", (req, res, next) => {
      logger.warn("Unmatched route:", {
        method: req.method,
        path: req.path,
        availableServices: this.services.map((s) => ({
          name: s.name,
          path: s.path,
        })),
      });
      next();
    });
  }
}
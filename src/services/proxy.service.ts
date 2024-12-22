import { AuthMiddleware } from './../middleware/authMiddleware';
import path from "path";
import { Application } from "express";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { logger } from "../utils/logger";
import { ServiceConfig } from "../config/service";
import { createRateLimiter } from "../rateLimit/rateLimit.middleware";
import url from "url";
import { TokenManager } from '../utils/TokenManager';

export class ProxyService {
  private app: Application;
  private services: ServiceConfig[];
  private tokenManager: TokenManager;
  private authMiddleware : AuthMiddleware


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
    // Sort services by path length in descending order
    const sortedServices = [...this.services].sort(
      (a, b) => b.path.length - a.path.length
    );

    sortedServices.forEach((service) => {
      const limiter = createRateLimiter();
      const parsedUrl = url.parse(service.url);

      // Debug log for service configuration
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

        // pathRewrite: (path, req) => {
        //   // Check if this is the correct service for this path
        //   if (!path.startsWith(service.path)) {
        //     logger.debug("Path does not match service:", {
        //       path,
        //       servicePath: service.path,
        //       serviceName: service.name,
        //     });
        //     return path;
        //   }

        //   let rewrittenPath = path.replace(new RegExp(`^${service.path}`), "");

        //   // If we're dealing with the auth service and GraphQL
        //   if (service.name === "AuthService" && parsedUrl.pathname) {
        //     // Ensure we're using the parsed URL's pathname
        //     rewrittenPath =
        //       parsedUrl.pathname + (rewrittenPath === "/" ? "" : rewrittenPath);
        //   }

        //   // Clean up the path
        //   rewrittenPath = `/${rewrittenPath
        //     .replace(/^\/+/, "")
        //     .replace(/\/+/g, "/")}`;

        //   logger.debug("Path rewrite details:", {
        //     originalPath: path,
        //     rewrittenPath,
        //     serviceName: service.name,
        //     finalUrl: `${targetHost}${rewrittenPath}`,
        //   });

        //   return rewrittenPath;
        // },

        on: {
          proxyReq: (proxyReq, req: any, res) => {
            const fullUrl = `${targetHost}${proxyReq.path}`;
            logger.debug("Full proxy request details:", {
              service: service.name,
              method: req.method,
              originalUrl: req.url,
              proxyPath: proxyReq.path,
              fullUrl,
              headers: proxyReq.getHeaders(),
              body: req.body,
            });
            fetch(fullUrl, { method: "OPTIONS" })
              .then(() =>
                logger.debug(`Connection test successful to ${fullUrl}`)
              )
              .catch((err) =>
                logger.error(`Connection test failed to ${fullUrl}:`, err)
              );
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

      this.app.use(routePaths, limiter,this.authMiddleware.authenticate, createProxyMiddleware(proxyOptions));
    });

    // Add a catch-all route to log unmatched requests
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

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import { ProxyService } from "./services/proxy.service";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { logger } from "./utils/logger";
import { SERVICES } from "./config/service";
import healthRoutes from "./routes/health";
import { errorMiddleware } from "./middleware/error-middleware";
import { AuthService } from "./services/auth.service";
import cookieParser from 'cookie-parser';

dotenv.config();

class ApiGateway {
  private app: express.Application;
  private proxyService: ProxyService;
  private authService: AuthService;

  constructor() {
    this.app = express();
    this.app.use(cookieParser())
    this.authService = new AuthService();
    this.proxyService = new ProxyService(this.app, SERVICES);
    this.configureMiddleware();
    this.setupRoutes();
    this.setupProxyRoutes();
    this.setupErrorHandling();

  
  }

  private configureMiddleware() {
    this.app.options("/graphql", (req, res) => {
      res.header("Access-Control-Allow-Origin", "http://localhost:3001");
      res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS,HEAD"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, apollo-require-preflight, Apollo-Require-Preflight"
      );
      res.header("Access-Control-Allow-Credentials", "true");
      res.sendStatus(204);
    });
    cors({
      origin: "http://localhost:3001",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "apollo-require-preflight",
        "Apollo-Require-Preflight",
      ],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    // Other middleware
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "unsafe-none" },
      })
    );
    this.app.use(compression());
    this.app.use(loggerMiddleware);
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes() {
    this.app.use(healthRoutes);
  }

  private setupProxyRoutes() {
    // Setup Microservice Proxy Routes
    this.proxyService.setupProxyRoutes();
  }

  private setupErrorHandling() {
    // Global Error Middleware
    this.app.use(errorMiddleware);
  }

  public start(port: number = 3000) {
    const server = this.app.listen(port, () => {
      logger.info(`API Gateway running on port ${port}`);
      logger.info("Configured Services:", {
        services: SERVICES.map((service) => ({
          name: service.name,
          path: service.path,
        })),
      });
    });

    // Graceful Shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down gracefully");
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    });
  }
}

// Create and start the API Gateway
const apiGateway = new ApiGateway();
apiGateway.start(parseInt(process.env.PORT || "3002"));

export default ApiGateway;
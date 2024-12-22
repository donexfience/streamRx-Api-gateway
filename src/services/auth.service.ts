import { Request, Response, NextFunction, Router } from "express";
import { AuthMiddleware } from "../middleware";
import { TokenManager } from "../utils/TokenManager";
import { TokenResponse } from "../types/auth.types";

export class AuthService {
  private tokenManager: TokenManager;
  private authMiddleware: AuthMiddleware;
  private router: Router;

  constructor() {
    if (!process.env.JWT_SECRET_KEY || !process.env.JWT_REFRESH_SECRET_KEY) {
      throw new Error("JWT secret keys must be defined in environment variables");
    }
    this.tokenManager = new TokenManager(
      process.env.JWT_SECRET_KEY,
      process.env.JWT_REFRESH_SECRET_KEY
    );
    this.authMiddleware = new AuthMiddleware(this.tokenManager);
    this.router = Router();
    this.setupMiddleware();
  }

  private setupMiddleware() {
    this.router.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.authMiddleware.authenticate(req, res, next);
      } catch (error) {
        next(error);
      }
    });
  }

  getAuthMiddleware() {
    return this.router;
  }
}
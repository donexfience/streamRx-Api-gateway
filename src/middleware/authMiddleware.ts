import { Request, Response, NextFunction } from "express";
import { TokenPayload, TokenResponse } from "../types/auth.types";
import { TokenManager } from "../utils/TokenManager";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export class AuthMiddleware {
  private readonly tokenManager: TokenManager;
  private readonly COMMON_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain:
      process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined,
  };

  private readonly COOKIE_OPTIONS2 = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 2 * 60,
  };

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  authenticate = async (
    req: Request,
    res: Response<TokenResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const accessToken = req.headers["accesstoken"]?.toString() || null;
      const refreshToken = req.headers["refreshtoken"]?.toString() || null;

      if (!accessToken && !refreshToken) {
        this.handleAuthenticationError(res, 401, "Authentication required");
        return;
      }

      if (accessToken && (await this.validateAccessToken(accessToken, req))) {
        next();
        return;
      }

      if (
        refreshToken &&
        (await this.handleTokenRefresh(refreshToken, req, res))
      ) {
        next();
        return;
      }

      this.clearAuthCookies(res);
      this.handleAuthenticationError(res, 401, "Authentication failed");
    } catch (error) {
      console.error("Auth middleware error:", error);
      this.handleAuthenticationError(res, 500, "Internal server error");
    }
  };

  private async validateAccessToken(
    token: string,
    req: Request
  ): Promise<boolean> {
    try {
      const decoded = this.tokenManager.verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async handleTokenRefresh(
    refreshToken: string,
    req: Request,
    res: Response
  ): Promise<boolean> {
    try {
      const decoded = this.tokenManager.verifyRefreshToken(refreshToken);
      if (!decoded) return false;

      const tokenPayload: TokenPayload = {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
      };

      const newAccessToken =
        this.tokenManager.generateAccessToken(tokenPayload);
      const newRefreshToken =
        this.tokenManager.generateRefreshToken(tokenPayload);

      res.cookie("accessToken", newAccessToken, {
        ...this.COMMON_COOKIE_OPTIONS,
        maxAge: 2 * 60 * 1000,
      });

      res.cookie("refreshToken", newRefreshToken, {
        ...this.COMMON_COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.setHeader("accessToken", newAccessToken);
      res.setHeader("refreshToken", newRefreshToken);

      res.locals.tokens = {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };

      req.user = tokenPayload;
      return true;
    } catch {
      return false;
    }
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  }

  private handleAuthenticationError(
    res: Response,
    status: number,
    message: string
  ): void {
    this.clearAuthCookies(res);
    res.status(status).json({
      success: false,
      message,
    });
  }
}

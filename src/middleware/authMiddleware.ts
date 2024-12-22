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
  private tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  authenticate = async (
    req: Request,
    res: Response<TokenResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log(req.headers["refresh-token"]);

      const accessToken = req.headers["authorization"] || null;
      const refreshToken = req.headers["refresh-token"] || null;
      if (accessToken && accessToken.startsWith("Bearer ")) {
        const token = accessToken.split(" ")[1];
        console.log("Access Token:", token);
      } else {
        console.log("No Access Token Found");
      }

      console.log("Access Token:", accessToken);
      console.log("Refresh Token:", refreshToken);

      // If no tokens at all, send authentication required
      if (!accessToken && !refreshToken) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // First try to verify access token if it exists
      let isAccessTokenValid = false;
      if (accessToken) {
        const stringAccess = accessToken.toString();
        try {
          const decodedAccess =
            this.tokenManager.verifyAccessToken(stringAccess);
          if (decodedAccess) {
            req.user = decodedAccess;
            isAccessTokenValid = true;
            next();
            return;
          }
        } catch (error) {
          console.log("Access token verification failed, trying refresh token");
          // Continue to refresh token logic
        }
      }

      // If access token is invalid or missing, try refresh token
      if (refreshToken) {
        try {
          const stringrefresh = refreshToken.toString();
          console.log("Verifying refresh token");
          const decodedRefresh =
            this.tokenManager.verifyRefreshToken(stringrefresh);

          if (decodedRefresh) {
            console.log("Refresh token valid, generating new tokens");
            const tokenPayload: TokenPayload = {
              userId: decodedRefresh.userId,
              role: decodedRefresh.role,
              email: decodedRefresh.email,
            };

            // Generate new tokens
            const newAccessToken =
              this.tokenManager.generateAccessToken(tokenPayload);
            const newRefreshToken =
              this.tokenManager.generateRefreshToken(tokenPayload);
            console.log(newAccessToken, newRefreshToken, "puthiya sanam");

            res.setHeader("Authorization", `Bearer ${newAccessToken}`);
            res.setHeader("Refresh-Token", newRefreshToken);
            next();
            return;
          }
        } catch (error) {
          console.log("Refresh token verification failed:", error);
          // Clear cookies if refresh token is invalid
          res.clearCookie("accessToken");
          res.clearCookie("refreshToken");

          res.status(401).json({
            success: false,
            message: "Invalid refresh token",
          });
          return;
        }
      }
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

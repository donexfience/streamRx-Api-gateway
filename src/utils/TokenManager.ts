import { TokenPayload } from "../types/auth.types";
import jwt from 'jsonwebtoken'

export class TokenManager {
  private secretKey: string;
  private refreshSecretKey: string;

  constructor(secretKey: string, refreshSecretKey: string) {
    this.secretKey = secretKey;
    this.refreshSecretKey = refreshSecretKey;
  }
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshSecretKey) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    console.log('hi bro access token indakkam')
    return jwt.sign(payload, this.secretKey, { expiresIn: "15m" });
  }

  generateRefreshToken(payload: TokenPayload): string {
    console.log('hi bro refresh token indakkam')
    return jwt.sign(payload, this.refreshSecretKey, { expiresIn: "7d" });
  }
}

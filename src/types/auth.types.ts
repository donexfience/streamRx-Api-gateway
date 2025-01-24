export interface TokenPayload {
  userId: string;
  [key: string]: any;
  role: string;
  isActive?:string;
  email?:string;
}

export interface TokenResponse {
  success: boolean;
  message: string;
  data?: any;
}

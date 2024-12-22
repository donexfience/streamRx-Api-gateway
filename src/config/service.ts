export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  timeout?: number;
  proxyBasePath?: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    name: "AuthService",
    url: process.env.AUTH_SERVICE_URL || "http://auth_service:8000/graphql",
    path: "/auth",
    timeout: 5000,
  },
  {
    name: "UserService",
    url: process.env.USER_SERVICE_URL || "http://nestjs_service:3000/users",
    path: "/users",
    timeout: 5000,
  },
];

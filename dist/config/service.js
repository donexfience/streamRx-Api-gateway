"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICES = void 0;
exports.SERVICES = [
    {
        name: 'UserService',
        url: process.env.USER_SERVICE_URL || 'http://localhost:8001',
        path: '/users',
        timeout: 5000
    },
    {
        name: 'ProductService',
        url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
        path: '/products',
        timeout: 5000
    },
];

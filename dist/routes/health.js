"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_1 = require("../config/service");
const router = express_1.default.Router();
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: service_1.SERVICES.map(service => ({
            name: service.name,
            url: service.url,
            path: service.path
        }))
    });
});
exports.default = router;

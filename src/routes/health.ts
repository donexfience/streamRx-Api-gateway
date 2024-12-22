import express from 'express';
import { SERVICES } from '../config/service';


const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: SERVICES.map(service => ({
      name: service.name,
      url: service.url,
      path: service.path
    }))
  });
});

export default router;
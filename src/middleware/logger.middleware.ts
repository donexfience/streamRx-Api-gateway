
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const loggerMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const start = Date.now();

  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} - ${res.statusCode}`, {
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};
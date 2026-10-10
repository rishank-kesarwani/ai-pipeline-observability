import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HEADERS } from '../constants';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existingCorrelation =
      (req.headers[HEADERS.CORRELATION_ID] as string) ||
      (req.headers[HEADERS.REQUEST_ID] as string);

    const correlationId = existingCorrelation || `corr-${uuidv4()}`;

    req.headers[HEADERS.CORRELATION_ID] = correlationId;
    req.headers[HEADERS.REQUEST_ID] = correlationId;
    (req as any).correlationId = correlationId;

    res.setHeader(HEADERS.CORRELATION_ID, correlationId);
    res.setHeader(HEADERS.REQUEST_ID, correlationId);

    next();
  }
}

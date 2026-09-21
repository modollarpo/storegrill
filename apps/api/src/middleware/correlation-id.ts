import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';

export interface CorrelationRequest extends Request {
  requestId?: string;
}

export function correlationId(req: CorrelationRequest, res: Response, next: NextFunction) {
  const id = (req.headers[HEADER] as string) || randomUUID();
  req.requestId = id;
  res.setHeader(HEADER, id);
  next();
}

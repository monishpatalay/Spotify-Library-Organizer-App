import { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 does not catch errors thrown in async handlers: the rejection goes
// unhandled and crashes the process. Route it to the error handler in app.ts.
export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => { fn(req, res, next).catch(next); };
}

import type { Request, Response, Handler } from '../router.js';

/**
 * Wraps an async route handler to catch errors.
 * With Bun.serve the server's fetch handler catches unhandled errors,
 * but this utility can still be used for explicit error handling.
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void> | void
): Handler {
  return async (req, res) => {
    await fn(req, res);
  };
}

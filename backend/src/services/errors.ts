/**
 * Shared error-response helper — matches section 9.6 of PROJECT_SPEC.md.
 *
 * Shape:  { "error": { "code": "SOME_CODE", "message": "Human readable." } }
 */
import { Response } from "express";

interface ErrorBody {
  code: string;
  message: string;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  const body: { error: ErrorBody } = { error: { code, message } };
  res.status(status).json(body);
}

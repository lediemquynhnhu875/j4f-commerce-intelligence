export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}
export function missing(): never { throw new ApiError(404, "NOT_FOUND", "Record not found"); }

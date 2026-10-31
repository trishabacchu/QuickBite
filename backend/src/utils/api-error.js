export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(code, message, details = []) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(code, message) {
    return new ApiError(404, code, message);
  }

  static conflict(code, message, details = []) {
    return new ApiError(409, code, message, details);
  }
}

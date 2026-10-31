import { ApiError } from '../utils/api-error.js';

export function validate(schema, source = 'body') {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(
        new ApiError(
          400,
          'VALIDATION_ERROR',
          'Please correct the highlighted fields.',
          details,
        ),
      );
    }
    req[source] = result.data;
    return next();
  };
}

import { Problems, type ValidationErrorFactory } from '@forinda/kickjs'

/**
 * The default 422 drops its per-field `errors` in production. The form in
 * web/ shows them next to each input, so send them in every environment.
 */
export const validationError: ValidationErrorFactory = ({ issues }) =>
  Problems.unprocessable({
    detail: issues[0]?.message ?? 'Validation failed',
    errors: issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  })

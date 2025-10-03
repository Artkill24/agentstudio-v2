import { z } from 'zod'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Email validation
export const emailSchema = z.string().email('Email non valida').max(255)

// Text input validation (prevent injection)
export const sanitizeText = (input: string, maxLength: number = 5000): string => {
  if (!input || typeof input !== 'string') {
    throw new ValidationError('Input non valido')
  }

  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()

  if (sanitized.length > maxLength) {
    throw new ValidationError(`Testo troppo lungo (max ${maxLength} caratteri)`)
  }

  return sanitized
}

// Document type validation
export const documentTypeSchema = z.enum([
  'contratto',
  'lettera', 
  'privacy',
  'termini',
  'fattura',
  'altro'
])

// Team role validation
export const roleSchema = z.enum(['owner', 'admin', 'member'])

// Query validation
export const querySchema = z.string()
  .min(3, 'Query troppo breve')
  .max(1000, 'Query troppo lunga')
  .refine(val => val.trim().length >= 3, 'Query deve contenere almeno 3 caratteri')

// UUID validation
export const uuidSchema = z.string().uuid('ID non valido')
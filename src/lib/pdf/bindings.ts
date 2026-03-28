const EXACT_PLACEHOLDER_PATTERN = /^\{\{\s*([^{}]+?)\s*\}\}$/
const INLINE_PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const resolvePath = (data: unknown, path: string): unknown => {
  const parts = path.split('.')
  let current: unknown = data

  for (const part of parts) {
    if (!isRecord(current)) {
      return undefined
    }

    current = current[part]
  }

  return current
}

const stringifyInlineValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

const bindString = (value: string, source: unknown): unknown => {
  const exactMatch = value.match(EXACT_PLACEHOLDER_PATTERN)
  if (exactMatch) {
    const resolved = resolvePath(source, exactMatch[1])
    return resolved === undefined || resolved === null ? '' : resolved
  }

  if (!value.includes('{{')) {
    return value
  }

  return value.replace(INLINE_PLACEHOLDER_PATTERN, (_fullMatch, path: string) => {
    return stringifyInlineValue(resolvePath(source, path))
  })
}

const bindUnknown = (value: unknown, source: unknown): unknown => {
  if (typeof value === 'string') {
    return bindString(value, source)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => bindUnknown(entry, source))
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).map(([key, nestedValue]) => [key, bindUnknown(nestedValue, source)])
    return Object.fromEntries(entries)
  }

  return value
}

export const bindTemplateData = <T>(template: T, source: unknown): T => {
  return bindUnknown(template, source) as T
}
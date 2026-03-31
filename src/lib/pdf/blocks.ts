import { rgb, type PDFDocument, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import type {
  PdfCustomerBlock,
  PdfHeaderBlock,
  PdfLogoBlock,
  PdfPaymentBlock,
  PdfSummaryBlock,
  PdfTableBlock,
  PdfTemplateBlock,
} from './template'

interface PdfRenderContext {
  page: PDFPage
  font: PDFFont
  color: RGB
  fontSize: number
}

interface PdfLogoRenderContext extends PdfRenderContext {
  pdfDocument: PDFDocument
}

const CELL_PADDING_X = 8

const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

const toNumberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

const drawLine = (
  context: PdfRenderContext,
  x: number,
  y: number,
  width: number,
  thickness = 0.8,
): void => {
  context.page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    color: context.color,
    thickness,
    opacity: 0.25,
  })
}

const drawBox = (
  context: PdfRenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  context.page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: context.color,
    borderWidth: 0.8,
    borderOpacity: 0.2,
    color: rgb(0.986, 0.986, 0.988),
  })
}

const drawText = (
  context: PdfRenderContext,
  text: string,
  x: number,
  y: number,
  size = context.fontSize,
): void => {
  if (text.length === 0) {
    return
  }

  context.page.drawText(text, {
    x,
    y,
    size,
    font: context.font,
    color: context.color,
  })
}

const getTextWidth = (context: PdfRenderContext, text: string, size = context.fontSize): number => {
  return context.font.widthOfTextAtSize(text, size)
}

const fitTextToWidth = (
  context: PdfRenderContext,
  text: string,
  maxWidth: number,
  size: number,
): string => {
  const normalized = text.trim()
  if (normalized.length === 0 || maxWidth <= 0) {
    return ''
  }

  if (getTextWidth(context, normalized, size) <= maxWidth) {
    return normalized
  }

  const ellipsis = '...'
  if (getTextWidth(context, ellipsis, size) > maxWidth) {
    return ''
  }

  let low = 0
  let high = normalized.length
  let best = ''

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = `${normalized.slice(0, mid).trimEnd()}${ellipsis}`
    const width = getTextWidth(context, candidate, size)

    if (width <= maxWidth) {
      best = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return best
}

const wrapTextToWidth = (
  context: PdfRenderContext,
  text: string,
  maxWidth: number,
  size: number,
  maxLines: number,
): string[] => {
  const normalized = text.trim()
  if (normalized.length === 0 || maxLines <= 0) {
    return ['']
  }

  if (getTextWidth(context, normalized, size) <= maxWidth) {
    return [normalized]
  }

  const words = normalized.split(/\s+/)
  const lines: string[] = []
  let index = 0

  while (index < words.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      const rest = words.slice(index).join(' ')
      lines.push(fitTextToWidth(context, rest, maxWidth, size))
      break
    }

    let line = ''
    while (index < words.length) {
      const candidate = line.length > 0 ? `${line} ${words[index]}` : words[index]
      if (getTextWidth(context, candidate, size) <= maxWidth) {
        line = candidate
        index += 1
        continue
      }

      break
    }

    if (line.length === 0) {
      line = fitTextToWidth(context, words[index], maxWidth, size)
      index += 1
    }

    lines.push(line)
  }

  return lines.length > 0 ? lines : ['']
}

const renderHeaderBlock = (block: PdfHeaderBlock, context: PdfRenderContext): void => {
  const x = toNumberValue(block.position.x)
  const y = toNumberValue(block.position.y)
  const pageWidth = context.page.getWidth()
  const rightPadding = 78
  const title = toStringValue(block.content.title)
  const businessName = toStringValue(block.content.businessName)
  const invoiceId = toStringValue(block.content.invoiceId)
  const date = toStringValue(block.content.date)

  drawText(context, title, x, y, context.fontSize + 5)
  drawText(context, invoiceId, x, y - 36)

  if (businessName.length > 0) {
    const businessWidth = getTextWidth(context, businessName, context.fontSize + 1)
    drawText(context, businessName, pageWidth - rightPadding - businessWidth, y - 10, context.fontSize + 1)
  }

  if (date.length > 0) {
    const dateWidth = getTextWidth(context, date, context.fontSize - 0.2)
    drawText(context, date, pageWidth - rightPadding - dateWidth, y - 28, context.fontSize - 0.2)
  }

  drawLine(context, 40, y - 58, pageWidth - 80, 1)
}

const renderCustomerBlock = (block: PdfCustomerBlock, context: PdfRenderContext): void => {
  const x = toNumberValue(block.position.x)
  const y = toNumberValue(block.position.y)
  const width = Math.max(160, toNumberValue(block.width, 250))
  const height = Math.max(50, toNumberValue(block.height, 74))
  const padding = Math.max(6, toNumberValue(block.padding, 10))

  drawBox(context, x, y, width, height)

  const lines = [
    toStringValue(block.content.title),
    toStringValue(block.content.name),
    toStringValue(block.content.address),
    toStringValue(block.content.phone),
    toStringValue(block.content.email),
  ].filter((line) => line.length > 0)

  lines.forEach((line, index) => {
    const size = index === 0 ? context.fontSize - 0.4 : context.fontSize - 0.3
    drawText(context, line, x + padding, y - padding - index * 13, size)
  })
}

const renderPaymentBlock = (block: PdfPaymentBlock, context: PdfRenderContext): void => {
  const x = toNumberValue(block.position.x)
  const y = toNumberValue(block.position.y)
  const width = Math.max(160, toNumberValue(block.width, 250))
  const height = Math.max(50, toNumberValue(block.height, 74))
  const padding = Math.max(6, toNumberValue(block.padding, 10))

  drawBox(context, x, y, width, height)

  const title = toStringValue(block.content.title)
  const method = toStringValue(block.content.method)
  const amountPaid = toStringValue(block.content.amountPaid)
  const change = toStringValue(block.content.change)
  const details = toStringValue(block.content.details)

  const lines = [
    title,
    method.length > 0 ? `Method: ${method}` : '',
    amountPaid.length > 0 ? `Amount Paid: ${amountPaid}` : '',
    change.length > 0 ? `Change: ${change}` : '',
    details.length > 0 ? details : '',
  ].filter((line) => line.length > 0)

  lines.forEach((line, index) => {
    const size = index === 0 ? context.fontSize - 0.4 : context.fontSize - 0.3
    drawText(context, line, x + padding, y - padding - index * 13, size)
  })
}

const renderTableBlock = (block: PdfTableBlock, context: PdfRenderContext): void => {
  const x = toNumberValue(block.position.x)
  const y = toNumberValue(block.position.y)
  const rowHeight = Math.max(22, toNumberValue(block.rowHeight, 22))
  const sourceColumns = block.columns.filter((column) => Number.isFinite(column.width) && column.width > 0)
  const items = Array.isArray(block.data) ? block.data : []

  const rawWidth = sourceColumns.reduce((sum, column) => sum + column.width, 0)
  const maxTableWidth = Math.max(260, context.page.getWidth() - x - 40)
  const scaleRatio = rawWidth > maxTableWidth ? maxTableWidth / rawWidth : 1
  const columns =
    scaleRatio < 1
      ? sourceColumns.map((column) => ({
          ...column,
          width: Math.max(56, column.width * scaleRatio),
        }))
      : sourceColumns
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)

  const headerBottom = y - rowHeight
  const tableBottom = headerBottom - items.length * rowHeight

  // Box wraps header + all data rows with small padding
  drawBox(context, x, y + 4, totalWidth, y + 4 - tableBottom + 2)

  // Header text — vertically centered in header row
  const headerBaseline = y - 14
  let cursorX = x
  columns.forEach((column) => {
    const labelSize = context.fontSize - 0.2
    const maxLabelWidth = Math.max(10, column.width - CELL_PADDING_X * 2)
    const label = fitTextToWidth(context, toStringValue(column.label), maxLabelWidth, labelSize)
    const isRight =
      column.align === 'right' || ['qty', 'price', 'total', 'quantity', 'unitPrice'].includes(column.key)

    if (isRight) {
      const labelWidth = getTextWidth(context, label, labelSize)
      drawText(context, label, cursorX + column.width - labelWidth - CELL_PADDING_X, headerBaseline, labelSize)
    } else {
      drawText(context, label, cursorX + CELL_PADDING_X, headerBaseline, labelSize)
    }
    cursorX += column.width
  })

  // Header separator
  drawLine(context, x, headerBottom, totalWidth, 0.8)

  // Data rows
  items.forEach((entry, rowIndex) => {
    if (typeof entry !== 'object' || entry === null) {
      return
    }

    const row = entry as Record<string, unknown>
    const rowTop = headerBottom - rowIndex * rowHeight
    const cellTextSize = context.fontSize - 0.5
    const lineHeight = cellTextSize + 1
    let cellX = x

    columns.forEach((column) => {
      const cellValue = toStringValue(row[column.key])
      const maxTextWidth = Math.max(10, column.width - CELL_PADDING_X * 2)
      const wrappedLines = wrapTextToWidth(context, cellValue, maxTextWidth, cellTextSize, 2)
      const totalTextHeight = wrappedLines.length * lineHeight
      const firstLineY = rowTop - (rowHeight - totalTextHeight) * 0.5 - cellTextSize + 2
      const isRight =
        column.align === 'right' || ['qty', 'price', 'total', 'quantity', 'unitPrice'].includes(column.key)

      wrappedLines.forEach((line, lineIndex) => {
        const lineY = firstLineY - lineIndex * lineHeight

        if (isRight) {
          const width = getTextWidth(context, line, cellTextSize)
          drawText(context, line, cellX + column.width - width - CELL_PADDING_X, lineY, cellTextSize)
          return
        }

        drawText(context, line, cellX + CELL_PADDING_X, lineY, cellTextSize)
      })

      cellX += column.width
    })

    // Draw separator between rows (not after the last row — box border covers it)
    if (rowIndex < items.length - 1) {
      const rowBottom = rowTop - rowHeight
      drawLine(context, x, rowBottom, totalWidth, 0.5)
    }
  })
}

const renderSummaryBlock = (block: PdfSummaryBlock, context: PdfRenderContext): void => {
  const x = toNumberValue(block.position.x)
  const y = toNumberValue(block.position.y)
  const summaryWidth = 200
  const valueRightEdge = x + summaryWidth

  const lines: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Subtotal', value: toStringValue(block.content.subtotal) },
    { label: 'Discount', value: toStringValue(block.content.discount) },
    { label: 'Tax', value: toStringValue(block.content.tax) },
    { label: 'Total', value: toStringValue(block.content.total), bold: true },
  ].filter((line) => line.value.length > 0)

  const lineHeight = 16

  lines.forEach((line, index) => {
    const rowY = y - index * lineHeight
    const size = line.bold ? context.fontSize + 1 : context.fontSize - 0.2

    if (line.bold) {
      drawLine(context, x, rowY + 12, summaryWidth, 0.8)
    }

    drawText(context, line.label, x, rowY, size)

    const width = getTextWidth(context, line.value, size)
    drawText(context, line.value, valueRightEdge - width, rowY, size)
  })
}

const decodeBase64 = (input: string): Uint8Array => {
  const binary = atob(input)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export const renderLogoBlock = async (
  block: PdfLogoBlock,
  context: PdfLogoRenderContext,
): Promise<void> => {
  const dataUrl = toStringValue(block.content.dataUrl)
  if (dataUrl.length === 0) {
    return
  }

  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/)
  if (!match) {
    return
  }

  const [, mimeType, encoded] = match

  try {
    const bytes = decodeBase64(encoded)
    const image =
      mimeType === 'image/png'
        ? await context.pdfDocument.embedPng(bytes)
        : await context.pdfDocument.embedJpg(bytes)

    const x = toNumberValue(block.position.x)
    const y = toNumberValue(block.position.y)
    const width = Math.max(24, toNumberValue(block.width, 84))
    const height = Math.max(16, toNumberValue(block.height, 28))

    const scale = Math.min(width / image.width, height / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    const drawX = x + (width - drawWidth) * 0.5
    const drawY = y - height + (height - drawHeight) * 0.5

    context.page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    })
  } catch {
    // Ignore malformed image data so PDF generation still succeeds.
  }
}

export const parseTemplateColor = (hexColor: string): RGB => {
  const normalized = hexColor.trim().replace('#', '')
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return rgb(0, 0, 0)
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return rgb(red, green, blue)
}

export const renderTemplateBlock = (block: PdfTemplateBlock, context: PdfRenderContext): void => {
  switch (block.type) {
    case 'logo':
      break
    case 'header':
      renderHeaderBlock(block, context)
      break
    case 'customer':
      renderCustomerBlock(block, context)
      break
    case 'payment':
      renderPaymentBlock(block, context)
      break
    case 'table':
      renderTableBlock(block, context)
      break
    case 'summary':
      renderSummaryBlock(block, context)
      break
    default:
      break
  }
}
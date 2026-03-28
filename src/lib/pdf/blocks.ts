import { rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import type {
  PdfCustomerBlock,
  PdfHeaderBlock,
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

const renderHeaderBlock = (block: PdfHeaderBlock, context: PdfRenderContext): void => {
  const x = toNumberValue(block.position.x)
  const y = toNumberValue(block.position.y)
  const pageWidth = context.page.getWidth()
  const rightPadding = 40
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
  const rowHeight = Math.max(16, toNumberValue(block.rowHeight, 22))
  const columns = block.columns.filter((column) => Number.isFinite(column.width) && column.width > 0)
  const items = Array.isArray(block.data) ? block.data : []
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)

  const headerBottom = y - rowHeight
  const tableBottom = headerBottom - items.length * rowHeight

  // Box wraps header + all data rows with small padding
  drawBox(context, x, y + 4, totalWidth, y + 4 - tableBottom + 2)

  // Header text — vertically centered in header row
  const headerBaseline = y - 14
  let cursorX = x
  columns.forEach((column) => {
    const label = toStringValue(column.label)
    const isRight =
      column.align === 'right' || ['qty', 'price', 'total', 'quantity', 'unitPrice'].includes(column.key)

    if (isRight) {
      const labelWidth = getTextWidth(context, label, context.fontSize - 0.2)
      drawText(context, label, cursorX + column.width - labelWidth - CELL_PADDING_X, headerBaseline, context.fontSize - 0.2)
    } else {
      drawText(context, label, cursorX + CELL_PADDING_X, headerBaseline, context.fontSize - 0.2)
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
    const rowBaseline = rowTop - 14
    let cellX = x

    columns.forEach((column) => {
      const cellValue = toStringValue(row[column.key])
      const isRight =
        column.align === 'right' || ['qty', 'price', 'total', 'quantity', 'unitPrice'].includes(column.key)

      if (isRight) {
        const width = getTextWidth(context, cellValue, context.fontSize - 0.5)
        drawText(context, cellValue, cellX + column.width - width - CELL_PADDING_X, rowBaseline, context.fontSize - 0.5)
      } else {
        drawText(context, cellValue, cellX + CELL_PADDING_X, rowBaseline, context.fontSize - 0.5)
      }
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
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * PDF export helpers built on pdf-lib. The built-in fonts use WinAnsi encoding,
 * so every string is normalised to ASCII before it is drawn.
 */

export const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 42;

export type PdfColumn = { label: string; width: number; align?: "left" | "right" };
export type PdfRow = Array<{ text: string; align?: "left" | "right" }>;

function ascii(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022]/g, "*")
    .replace(/[^\x20-\x7E]/g, "");
}

export function formatMoneyPlain(minor: number, currency = "GHS"): string {
  const amount = Math.abs(minor) / 100;
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const sign = minor < 0 ? "-" : "";
  return `${sign}${currency} ${formatted}`;
}

export function formatNumberPlain(value: number): string {
  return new Intl.NumberFormat("en-GH").format(value);
}

export class PdfBuilder {
  private doc: PDFDocument;
  private page: PDFPage;
  private regular: PDFFont;
  private bold: PDFFont;
  private cursorY: number;

  private constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.page = doc.addPage([A4.width, A4.height]);
    this.cursorY = A4.height - MARGIN;
  }

  static async create(): Promise<PdfBuilder> {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfBuilder(doc, regular, bold);
  }

  get contentWidth(): number {
    return A4.width - MARGIN * 2;
  }

  private draw(
    text: string,
    x: number,
    y: number,
    options: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) {
    this.page.drawText(ascii(text), {
      x,
      y,
      size: options.size ?? 9,
      font: options.bold ? this.bold : this.regular,
      color: options.color ?? rgb(0.08, 0.13, 0.11),
    });
  }

  text(
    value: string,
    options: {
      size?: number;
      bold?: boolean;
      gap?: number;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) {
    this.draw(value, MARGIN, this.cursorY, options);
    this.cursorY -= options.gap ?? (options.size ?? 9) + 6;
  }

  rule(color = rgb(0.88, 0.9, 0.87)) {
    this.page.drawLine({
      start: { x: MARGIN, y: this.cursorY },
      end: { x: A4.width - MARGIN, y: this.cursorY },
      thickness: 0.6,
      color,
    });
    this.cursorY -= 12;
  }

  space(amount = 12) {
    this.cursorY -= amount;
  }

  heading(value: string) {
    this.space(6);
    this.draw(value, MARGIN, this.cursorY, {
      size: 12,
      bold: true,
      color: rgb(0.05, 0.36, 0.28),
    });
    this.cursorY -= 18;
  }

  keyValues(values: Array<{ label: string; value: string }>) {
    const labelWidth = 190;
    for (const item of values) {
      this.draw(item.label, MARGIN, this.cursorY, { size: 9, color: rgb(0.42, 0.47, 0.44) });
      this.draw(item.value, MARGIN + labelWidth, this.cursorY, { size: 9, bold: true });
      this.cursorY -= 15;
    }
    this.space(4);
  }

  table(columns: PdfColumn[], rows: PdfRow[]) {
    let x = MARGIN;
    for (const column of columns) {
      this.draw(
        column.label,
        column.align === "right" ? x + column.width - 4 : x,
        this.cursorY,
        { size: 8, bold: true, color: rgb(0.35, 0.4, 0.37) },
      );
      x += column.width;
    }
    this.cursorY -= 6;
    this.page.drawLine({
      start: { x: MARGIN, y: this.cursorY },
      end: { x: A4.width - MARGIN, y: this.cursorY },
      thickness: 0.8,
      color: rgb(0.78, 0.82, 0.79),
    });
    this.cursorY -= 14;

    for (const row of rows) {
      if (this.cursorY < MARGIN + 40) {
        this.page = this.doc.addPage([A4.width, A4.height]);
        this.cursorY = A4.height - MARGIN;
      }
      let cellX = MARGIN;
      row.forEach((cell, index) => {
        const column = columns[index];
        const width = column?.width ?? 100;
        if (cell.align === "right" || column?.align === "right") {
          this.draw(cell.text, cellX + width - 4, this.cursorY, { size: 8.5 });
        } else {
          this.draw(cell.text, cellX, this.cursorY, { size: 8.5 });
        }
        cellX += width;
      });
      this.cursorY -= 14;
    }
    this.space(8);
  }

  footer(note: string) {
    this.page.drawText(ascii(note), {
      x: MARGIN,
      y: MARGIN - 12,
      size: 7.5,
      font: this.regular,
      color: rgb(0.55, 0.6, 0.57),
    });
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

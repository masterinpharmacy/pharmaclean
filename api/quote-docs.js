import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import ExcelJS from "exceljs";

const TEAL_DEEP = "0F3D3E";
const AMBER = "D9774B";
const MUTED = "5A6462";

function fmtEuro(n) {
  return "EUR " + n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- PDF ----------
function buildPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).fillColor(TEAL_DEEP).text("PharmaClean", { continued: false });
    doc.fontSize(10).fillColor(MUTED).text("Specialist in reiniging voor apotheken en zorgpraktijken");
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#D8E2DF").stroke();
    doc.moveDown(1);

    doc.fontSize(15).fillColor(TEAL_DEEP).text("Offerte-indicatie");
    doc.fontSize(10).fillColor(MUTED).text(`Aanvraagdatum: ${data.datum}`);
    if (data.praktijknaam) doc.text(`Praktijk: ${data.praktijknaam}`);
    doc.text(`Contact: ${data.email}${data.telefoon ? "  |  " + data.telefoon : ""}`);
    doc.moveDown(1);

    // table header
    const colX = { item: 50, aantal: 330, tarief: 400, subtotaal: 475 };
    doc.fontSize(10).fillColor(TEAL_DEEP);
    doc.text("Onderdeel", colX.item, doc.y, { continued: false });
    doc.text("Aantal", colX.aantal, doc.y - doc.currentLineHeight(), { width: 60, align: "right" });
    doc.text("Tarief", colX.tarief, doc.y - doc.currentLineHeight(), { width: 60, align: "right" });
    doc.text("Subtotaal", colX.subtotaal, doc.y - doc.currentLineHeight(), { width: 70, align: "right" });
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#D8E2DF").stroke();
    doc.moveDown(0.3);

    doc.fontSize(10).fillColor("#1A1A1A");
    data.items.forEach((it) => {
      const y = doc.y;
      doc.text(it.label, colX.item, y, { width: 270 });
      doc.text(String(it.aantal), colX.aantal, y, { width: 60, align: "right" });
      doc.text(fmtEuro(it.tarief), colX.tarief, y, { width: 70, align: "right" });
      doc.text(fmtEuro(it.subtotaal), colX.subtotaal, y, { width: 70, align: "right" });
      doc.moveDown(0.5);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#D8E2DF").stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor(MUTED).text(`Prijs per beurt: ${fmtEuro(data.perBeurt)}`, 50, doc.y, { width: 495, align: "right" });
    doc.text(`Frequentie: ${data.frequentie} (${data.beurtenPerMaand} beurten per maand)`, 50, doc.y, { width: 495, align: "right" });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor(TEAL_DEEP).text(`Totaal per maand: ${fmtEuro(data.totaalPerMaand)}`, 50, doc.y, { width: 495, align: "right" });

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor(MUTED).text(
      "Indicatieve prijs exclusief btw. Definitieve offerte na een korte intake op locatie. Geen verborgen kosten.",
      50, doc.y, { width: 495 }
    );

    doc.end();
  });
}

// ---------- DOCX ----------
async function buildDocx(data) {
  const headerRow = new TableRow({
    children: ["Onderdeel", "Aantal", "Tarief", "Subtotaal"].map(
      (t, i) =>
        new TableCell({
          width: { size: i === 0 ? 40 : 20, type: WidthType.PERCENTAGE },
          shading: { fill: TEAL_DEEP },
          children: [
            new Paragraph({
              alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
              children: [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })],
            }),
          ],
        })
    ),
  });

  const itemRows = data.items.map(
    (it) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.label, size: 20 })] })] }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(it.aantal), size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtEuro(it.tarief), size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtEuro(it.subtotaal), size: 20 })] })],
          }),
        ],
      })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...itemRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "PharmaClean", bold: true, size: 32, color: TEAL_DEEP })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Specialist in reiniging voor apotheken en zorgpraktijken", size: 18, color: MUTED })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Offerte-indicatie", bold: true, size: 28, color: TEAL_DEEP })],
            spacing: { after: 120 },
          }),
          new Paragraph({ children: [new TextRun({ text: `Aanvraagdatum: ${data.datum}`, size: 20 })], spacing: { after: 40 } }),
          ...(data.praktijknaam
            ? [new Paragraph({ children: [new TextRun({ text: `Praktijk: ${data.praktijknaam}`, size: 20 })], spacing: { after: 40 } })]
            : []),
          new Paragraph({
            children: [new TextRun({ text: `Contact: ${data.email}${data.telefoon ? "  |  " + data.telefoon : ""}`, size: 20 })],
            spacing: { after: 240 },
          }),
          table,
          new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Prijs per beurt: ${fmtEuro(data.perBeurt)}`, size: 20, color: MUTED })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Frequentie: ${data.frequentie} (${data.beurtenPerMaand} beurten per maand)`,
                size: 20,
                color: MUTED,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Totaal per maand: ${fmtEuro(data.totaalPerMaand)}`, bold: true, size: 26, color: TEAL_DEEP })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Indicatieve prijs exclusief btw. Definitieve offerte na een korte intake op locatie. Geen verborgen kosten.",
                size: 16,
                color: MUTED,
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ---------- XLSX ----------
async function buildXlsx(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PharmaClean";
  const sheet = workbook.addWorksheet("Offerte");

  sheet.columns = [
    { header: "Onderdeel", key: "label", width: 34 },
    { header: "Aantal", key: "aantal", width: 12 },
    { header: "Tarief", key: "tarief", width: 14 },
    { header: "Subtotaal", key: "subtotaal", width: 14 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F3D3E" } };
    cell.alignment = { horizontal: "right" };
  });
  sheet.getCell("A1").alignment = { horizontal: "left" };

  data.items.forEach((it) => {
    sheet.addRow({ label: it.label, aantal: it.aantal, tarief: it.tarief, subtotaal: it.subtotaal });
  });

  sheet.getColumn("tarief").numFmt = '"EUR "#,##0.00';
  sheet.getColumn("subtotaal").numFmt = '"EUR "#,##0.00';
  sheet.getColumn("aantal").alignment = { horizontal: "right" };
  sheet.getColumn("tarief").alignment = { horizontal: "right" };
  sheet.getColumn("subtotaal").alignment = { horizontal: "right" };

  sheet.addRow({});
  const beurtRow = sheet.addRow({ label: "Prijs per beurt", subtotaal: data.perBeurt });
  beurtRow.getCell("subtotaal").numFmt = '"EUR "#,##0.00';
  const freqRow = sheet.addRow({ label: "Frequentie", aantal: `${data.frequentie} (${data.beurtenPerMaand}/maand)` });
  const totalRow = sheet.addRow({ label: "Totaal per maand", subtotaal: data.totaalPerMaand });
  totalRow.font = { bold: true };
  totalRow.getCell("subtotaal").numFmt = '"EUR "#,##0.00';
  totalRow.getCell("subtotaal").font = { bold: true };

  sheet.addRow({});
  sheet.addRow({ label: `Aanvraagdatum: ${data.datum}` });
  if (data.praktijknaam) sheet.addRow({ label: `Praktijk: ${data.praktijknaam}` });
  sheet.addRow({ label: `Contact: ${data.email}${data.telefoon ? "  |  " + data.telefoon : ""}` });

  return workbook.xlsx.writeBuffer();
}

export { buildPdf, buildDocx, buildXlsx };

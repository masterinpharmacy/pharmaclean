import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, "assets", "logo.png");
const MASCOT_PATH = path.join(__dirname, "assets", "mascot.png");

const TEAL_DEEP = "#0F3D3E";
const TEAL = "#3E9C82";
const TEAL_PALE = "#E3EFEA";
const AMBER = "#D9774B";
const MUTED = "#5A6462";
const LINE = "#D8E2DF";

function fmtEuro(n) {
  return "EUR " + Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- PDF ----------
function buildPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const marginX = 50;
    const contentWidth = pageWidth - marginX * 2;

    // --- header band ---
    doc.rect(0, 0, pageWidth, 108).fill(TEAL_DEEP);
    try {
      doc.image(LOGO_PATH, marginX, 24, { width: 58 });
    } catch (e) {}
    doc.fillColor("#FFFFFF").fontSize(21).text("PharmaClean", marginX + 74, 32);
    doc.fontSize(10).fillColor(TEAL_PALE).text("Specialist in reiniging voor apotheken en zorgpraktijken", marginX + 74, 60);

    let y = 138;

    doc.fontSize(16).fillColor(TEAL_DEEP).text("Offerte-indicatie", marginX, y);
    y += 26;
    doc.fontSize(10).fillColor(MUTED);
    doc.text(`Aanvraagdatum: ${data.datum}`, marginX, y);
    y += 15;
    if (data.praktijknaam) {
      doc.text(`Praktijk: ${data.praktijknaam}`, marginX, y);
      y += 15;
    }
    doc.text(`Contact: ${data.email}${data.telefoon ? "  |  " + data.telefoon : ""}`, marginX, y);
    y += 28;

    // --- table ---
    const colItem = marginX;
    const colAantal = marginX + 270;
    const colTarief = marginX + 340;
    const colSubtotaal = marginX + 415;
    const colSubtotaalW = contentWidth - 415;

    const rowH = 22;

    // header row
    doc.rect(marginX, y, contentWidth, rowH).fill(TEAL_DEEP);
    doc.fontSize(9.5).fillColor("#FFFFFF");
    doc.text("Onderdeel", colItem + 8, y + 6);
    doc.text("Aantal", colAantal, y + 6, { width: 60, align: "right" });
    doc.text("Tarief", colTarief, y + 6, { width: 65, align: "right" });
    doc.text("Subtotaal", colSubtotaal, y + 6, { width: colSubtotaalW - 8, align: "right" });
    y += rowH;

    data.items.forEach((it, i) => {
      if (i % 2 === 1) {
        doc.rect(marginX, y, contentWidth, rowH).fill(TEAL_PALE);
      }
      doc.fontSize(9.5).fillColor("#1A1A1A");
      doc.text(it.label, colItem + 8, y + 6, { width: 255 });
      doc.text(String(it.aantal), colAantal, y + 6, { width: 60, align: "right" });
      doc.text(fmtEuro(it.tarief), colTarief, y + 6, { width: 65, align: "right" });
      doc.text(fmtEuro(it.subtotaal), colSubtotaal, y + 6, { width: colSubtotaalW - 8, align: "right" });
      y += rowH;
    });

    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y).strokeColor(LINE).stroke();
    y += 16;

    // --- totals box ---
    const boxW = 250;
    const boxX = marginX + contentWidth - boxW;
    const boxH = 92;
    doc.roundedRect(boxX, y, boxW, boxH, 6).fill(TEAL_PALE);
    let ty = y + 14;
    doc.fontSize(10).fillColor(MUTED);
    doc.text(`Prijs per beurt: ${fmtEuro(data.perBeurt)}`, boxX + 16, ty, { width: boxW - 32, align: "right" });
    ty += 16;
    doc.text(`Frequentie: ${data.frequentie}`, boxX + 16, ty, { width: boxW - 32, align: "right" });
    ty += 15;
    doc.text(`(${data.beurtenPerMaand} beurten per maand)`, boxX + 16, ty, { width: boxW - 32, align: "right" });
    ty += 20;
    doc.fontSize(15).fillColor(TEAL_DEEP).text(`${fmtEuro(data.totaalPerMaand)} / mnd`, boxX + 16, ty, { width: boxW - 32, align: "right" });

    y += boxH + 30;

    doc.fontSize(9).fillColor(MUTED).text(
      "Indicatieve prijs exclusief btw. Definitieve offerte na een korte intake op locatie. Geen verborgen kosten.",
      marginX, y, { width: contentWidth }
    );

    // --- footer with mascot ---
    const footerY = doc.page.height - 90;
    doc.moveTo(marginX, footerY).lineTo(marginX + contentWidth, footerY).strokeColor(LINE).stroke();
    try {
      doc.image(MASCOT_PATH, marginX, footerY + 12, { width: 46 });
    } catch (e) {}
    doc.fontSize(9).fillColor(MUTED).text(
      "PharmaClean, uw specialist in reiniging voor apotheken en zorgpraktijken.",
      marginX + 58, footerY + 24, { width: contentWidth - 58 }
    );
    doc.fontSize(8.5).fillColor(TEAL).text("pharmaclean.nl", marginX + 58, footerY + 40);

    doc.end();
  });
}

// ---------- XLSX ----------
async function buildXlsx(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PharmaClean";
  const sheet = workbook.addWorksheet("Offerte", {
    views: [{ showGridLines: false }],
  });

  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 14;

  sheet.pageSetup = {
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    orientation: "portrait",
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  sheet.printArea = "A1:D40";

  // logo image, top-left
  const logoId = workbook.addImage({ filename: LOGO_PATH, extension: "png" });
  sheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 44, height: 44 } });

  sheet.mergeCells("B1:D1");
  sheet.getCell("B1").value = "PharmaClean";
  sheet.getCell("B1").font = { bold: true, size: 16, color: { argb: "FF0F3D3E" } };
  sheet.mergeCells("B2:D2");
  sheet.getCell("B2").value = "Specialist in reiniging voor apotheken en zorgpraktijken";
  sheet.getCell("B2").font = { italic: true, size: 10, color: { argb: "FF5A6462" } };

  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 16;
  sheet.addRow([]);

  sheet.mergeCells("A4:D4");
  sheet.getCell("A4").value = "Offerte-indicatie (bewerkbaar)";
  sheet.getCell("A4").font = { bold: true, size: 13, color: { argb: "FF0F3D3E" } };

  sheet.addRow([`Aanvraagdatum: ${data.datum}`]);
  if (data.praktijknaam) sheet.addRow([`Praktijk: ${data.praktijknaam}`]);
  sheet.addRow([`Contact: ${data.email}${data.telefoon ? "  |  " + data.telefoon : ""}`]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["Onderdeel", "Aantal", "Tarief (EUR)", "Subtotaal"]);
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber <= 4) {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F3D3E" } };
      cell.alignment = { horizontal: colNumber === 1 ? "left" : "right" };
    }
  });

  const firstItemRow = headerRow.number + 1;
  data.items.forEach((it, i) => {
    const r = firstItemRow + i;
    const row = sheet.getRow(r);
    row.getCell(1).value = it.label;
    row.getCell(2).value = it.aantal;
    row.getCell(3).value = it.tarief;
    row.getCell(4).value = { formula: `B${r}*C${r}` };
    row.getCell(3).numFmt = '"EUR "#,##0.00';
    row.getCell(4).numFmt = '"EUR "#,##0.00';
    row.getCell(2).alignment = { horizontal: "right" };
    row.getCell(3).alignment = { horizontal: "right" };
    row.getCell(4).alignment = { horizontal: "right" };
    if (i % 2 === 1) {
      for (let c = 1; c <= 4; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3EFEA" } };
      }
    }
    row.commit();
  });
  const lastItemRow = firstItemRow + data.items.length - 1;

  for (let r = headerRow.number; r <= lastItemRow; r++) {
    for (let c = 1; c <= 4; c++) {
      sheet.getRow(r).getCell(c).border = {
        top: { style: "thin", color: { argb: "FFD8E2DF" } },
        bottom: { style: "thin", color: { argb: "FFD8E2DF" } },
      };
    }
  }

  // editable inputs: aantal and tarief cells get a light "editable" tint so it's clear what to change
  for (let r = firstItemRow; r <= lastItemRow; r++) {
    sheet.getCell(`B${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF3EC" } };
    sheet.getCell(`C${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF3EC" } };
  }

  sheet.addRow([]);

  const beurtRow = sheet.addRow(["Prijs per beurt", "", "", { formula: `SUM(D${firstItemRow}:D${lastItemRow})` }]);
  beurtRow.getCell(4).numFmt = '"EUR "#,##0.00';
  beurtRow.getCell(4).alignment = { horizontal: "right" };
  beurtRow.getCell(1).font = { color: { argb: "FF5A6462" } };

  const beurtenRow = sheet.addRow(["Beurten per maand", data.beurtenPerMaand]);
  beurtenRow.getCell(2).alignment = { horizontal: "right" };
  beurtenRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF3EC" } };
  beurtenRow.getCell(1).font = { color: { argb: "FF5A6462" } };

  const kortingRow = sheet.addRow(["Korting", data.korting]);
  kortingRow.getCell(2).numFmt = "0%";
  kortingRow.getCell(2).alignment = { horizontal: "right" };
  kortingRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF3EC" } };
  kortingRow.getCell(1).font = { color: { argb: "FF5A6462" } };

  sheet.addRow(["Frequentie (omschrijving)", data.frequentie]);

  const minRow = sheet.addRow(["Minimumbedrag per maand", 150]);
  minRow.getCell(2).numFmt = '"EUR "#,##0.00';
  minRow.getCell(2).alignment = { horizontal: "right" };
  minRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF3EC" } };
  minRow.getCell(1).font = { color: { argb: "FF5A6462" } };

  const totalRow = sheet.addRow([
    "Totaal per maand",
    "",
    "",
    { formula: `MAX(D${beurtRow.number}*B${beurtenRow.number}*(1-B${kortingRow.number}),B${minRow.number})` },
  ]);
  totalRow.font = { bold: true, size: 12, color: { argb: "FF0F3D3E" } };
  totalRow.getCell(4).numFmt = '"EUR "#,##0.00';
  totalRow.getCell(4).alignment = { horizontal: "right" };
  totalRow.getCell(1).border = { top: { style: "thin", color: { argb: "FFD8E2DF" } } };
  totalRow.getCell(4).border = { top: { style: "thin", color: { argb: "FFD8E2DF" } } };

  const editNoteRow = sheet.addRow([]);
  sheet.getCell(`A${editNoteRow.number}`).value =
    "Lichtgeel gemarkeerde cellen (aantal, tarief, beurten per maand, korting) kunt u aanpassen. De subtotalen en het maandtotaal rekenen automatisch mee.";
  sheet.getCell(`A${editNoteRow.number}`).font = { italic: true, size: 9, color: { argb: "FF5A6462" } };
  sheet.mergeCells(`A${editNoteRow.number}:D${editNoteRow.number}`);
  sheet.getRow(editNoteRow.number).height = 28;
  sheet.getCell(`A${editNoteRow.number}`).alignment = { wrapText: true };

  const noteRowNum = editNoteRow.number + 2;
  sheet.getCell(`A${noteRowNum}`).value =
    "Indicatieve prijs exclusief btw. Definitieve offerte na een korte intake op locatie. Geen verborgen kosten.";
  sheet.getCell(`A${noteRowNum}`).font = { italic: true, size: 9, color: { argb: "FF5A6462" } };

  // mascot + tagline as a footer, placed within the printed column range (not off to the side)
  const footerRowNum = noteRowNum + 3;
  const mascotId = workbook.addImage({ filename: MASCOT_PATH, extension: "png" });
  sheet.addImage(mascotId, { tl: { col: 0, row: footerRowNum - 1 }, ext: { width: 50, height: 50 } });
  sheet.getCell(`B${footerRowNum}`).value = "PharmaClean, uw specialist in reiniging voor apotheken en zorgpraktijken.";
  sheet.getCell(`B${footerRowNum}`).font = { size: 10, color: { argb: "FF5A6462" } };
  sheet.getCell(`B${footerRowNum + 1}`).value = "pharmaclean.nl";
  sheet.getCell(`B${footerRowNum + 1}`).font = { size: 9, color: { argb: "FF3E9C82" } };
  for (let r = footerRowNum - 1; r <= footerRowNum + 2; r++) {
    sheet.getRow(r).height = 15;
  }

  return workbook.xlsx.writeBuffer();
}

export { buildPdf, buildXlsx };

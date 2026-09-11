import { Resend } from 'resend';
import { buildPdf, buildDocx, buildXlsx } from './quote-docs.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items, perBeurt, frequentie, beurtenPerMaand, totaalPerMaand, email, telefoon, praktijknaam } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Geldig e-mailadres verplicht' });
  }
  if (!telefoon) {
    return res.status(400).json({ error: 'Telefoonnummer verplicht' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Geen offertegegevens ontvangen' });
  }

  const docData = {
    datum: new Date().toLocaleDateString('nl-NL'),
    praktijknaam: praktijknaam || '',
    email,
    telefoon,
    items,
    perBeurt: Number(perBeurt) || 0,
    frequentie: frequentie || '',
    beurtenPerMaand: Number(beurtenPerMaand) || 0,
    totaalPerMaand: Number(totaalPerMaand) || 0,
  };

  try {
    const [pdfBuffer, docxBuffer, xlsxBuffer] = await Promise.all([
      buildPdf(docData),
      buildDocx(docData),
      buildXlsx(docData),
    ]);

    const itemRowsHtml = items
      .map(
        (it) =>
          `<tr><td>${it.label}</td><td style="text-align:right">${it.aantal}</td><td style="text-align:right">&euro;${Number(it.tarief).toFixed(2)}</td><td style="text-align:right">&euro;${Number(it.subtotaal).toFixed(2)}</td></tr>`
      )
      .join('');

    await resend.emails.send({
      from: 'PharmaClean <offerte@pharmaclean.nl>',
      to: 'info@pharmaclean.nl',
      reply_to: email,
      subject: `Nieuwe offerteaanvraag${praktijknaam ? ': ' + praktijknaam : ''}`,
      html: `
        <h2>Nieuwe offerteaanvraag via pharmaclean.nl</h2>
        <p><strong>Praktijk:</strong> ${praktijknaam || '-'}</p>
        <p><strong>E-mail aanvrager:</strong> ${email}</p>
        <p><strong>Telefoonnummer:</strong> ${telefoon}</p>
        <table cellpadding="6" style="border-collapse:collapse;width:100%;max-width:520px">
          <thead>
            <tr style="background:#0F3D3E;color:#fff">
              <th style="text-align:left">Onderdeel</th><th style="text-align:right">Aantal</th><th style="text-align:right">Tarief</th><th style="text-align:right">Subtotaal</th>
            </tr>
          </thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>
        <p><strong>Prijs per beurt:</strong> &euro;${docData.perBeurt.toFixed(2)}</p>
        <p><strong>Frequentie:</strong> ${frequentie} (${docData.beurtenPerMaand} beurten per maand)</p>
        <p style="font-size:18px"><strong>Totaal per maand: &euro;${docData.totaalPerMaand.toFixed(2)}</strong></p>
        <p style="color:#5A6462;font-size:13px">De volledige offerte is als PDF, Word en Excel bijgevoegd.</p>
      `,
      attachments: [
        { filename: 'offerte-pharmaclean.pdf', content: pdfBuffer.toString('base64') },
        { filename: 'offerte-pharmaclean.docx', content: docxBuffer.toString('base64') },
        { filename: 'offerte-pharmaclean.xlsx', content: Buffer.from(xlsxBuffer).toString('base64') },
      ],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Versturen mislukt' });
  }
}

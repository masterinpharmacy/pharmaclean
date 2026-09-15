import { Resend } from 'resend';
import { buildPdf, buildXlsx } from './quote-docs.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const INTERN_EMAIL = 'info@pharmaclean.nl';
const MARKUP_FACTOR = 1.10;
const MIN_MONTHLY = 150;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items, frequentie, beurtenPerMaand, korting, email, telefoon, praktijknaam } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Geldig e-mailadres verplicht' });
  }
  if (!telefoon) {
    return res.status(400).json({ error: 'Telefoonnummer verplicht' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Geen offertegegevens ontvangen' });
  }

  const isIntern = email.trim().toLowerCase() === INTERN_EMAIL;

  if (isIntern && !praktijknaam) {
    return res.status(400).json({ error: 'Klantnaam verplicht voor een definitieve offerte' });
  }

  // basisprijs altijd server-side herberekenen uit de itemlijst, niet blind vertrouwen op de frontend-totalen
  let finalItems = items;
  const basisPerBeurt = items.reduce((sum, it) => sum + Number(it.subtotaal || 0), 0);

  if (isIntern) {
    // opslag onzichtbaar verwerken in elk tarief, geen aparte regel op de offerte
    finalItems = items.map((it) => {
      const tarief = Math.round(Number(it.tarief) * MARKUP_FACTOR * 100) / 100;
      const subtotaal = Math.round(Number(it.aantal) * tarief * 100) / 100;
      return { ...it, tarief, subtotaal };
    });
  }

  const perBeurt = finalItems.reduce((sum, it) => sum + Number(it.subtotaal || 0), 0);
  const beurtenPerMaandNum = Number(beurtenPerMaand) || 0;
  const kortingNum = Number(korting) || 0;
  const totaalPerMaand = Math.round(Math.max(perBeurt * beurtenPerMaandNum * (1 - kortingNum), MIN_MONTHLY) * 100) / 100;

  const docData = {
    datum: new Date().toLocaleDateString('nl-NL'),
    praktijknaam: praktijknaam || '',
    email,
    telefoon,
    items: finalItems,
    perBeurt,
    frequentie: frequentie || '',
    beurtenPerMaand: beurtenPerMaandNum,
    korting: kortingNum,
    totaalPerMaand,
    isDefinitief: isIntern,
  };

  try {
    const [pdfBuffer, xlsxBuffer] = await Promise.all([
      buildPdf(docData),
      buildXlsx(docData),
    ]);

    const itemRowsHtml = finalItems
      .map(
        (it) =>
          `<tr><td>${it.label}</td><td style="text-align:right">${it.aantal}</td><td style="text-align:right">&euro;${Number(it.tarief).toFixed(2)}</td><td style="text-align:right">&euro;${Number(it.subtotaal).toFixed(2)}</td></tr>`
      )
      .join('');

    const itemsTableHtml = `
      <table cellpadding="6" style="border-collapse:collapse;width:100%;max-width:520px">
        <thead>
          <tr style="background:#0F3D3E;color:#fff">
            <th style="text-align:left">Onderdeel</th><th style="text-align:right">Aantal</th><th style="text-align:right">Tarief</th><th style="text-align:right">Subtotaal</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>
      <p><strong>Prijs per beurt:</strong> &euro;${perBeurt.toFixed(2)}</p>
      <p><strong>Frequentie:</strong> ${frequentie} (${beurtenPerMaandNum} beurten per maand)</p>
      <p style="font-size:18px"><strong>Totaal per maand: &euro;${totaalPerMaand.toFixed(2)}</strong></p>
    `;

    const internalAttachments = [
      { filename: isIntern ? 'definitieve-offerte-pharmaclean.pdf' : 'offerte-pharmaclean.pdf', content: pdfBuffer.toString('base64') },
      { filename: isIntern ? 'definitieve-offerte-pharmaclean.xlsx' : 'offerte-pharmaclean.xlsx', content: Buffer.from(xlsxBuffer).toString('base64') },
    ];

    if (isIntern) {
      // eigen aanvraag: alleen de zaak zelf ontvangt de definitieve offerte, met PDF en Excel
      await resend.emails.send({
        from: 'PharmaClean <offerte@pharmaclean.nl>',
        to: INTERN_EMAIL,
        subject: `Definitieve offerte voor ${praktijknaam}`,
        html: `
          <h2>Definitieve offerte voor ${praktijknaam}</h2>
          <p style="color:#5A6462;font-size:13px">Basisprijs per beurt: &euro;${basisPerBeurt.toFixed(2)}, inclusief 10% opslag: &euro;${perBeurt.toFixed(2)}.</p>
          ${itemsTableHtml}
          <p style="color:#5A6462;font-size:13px">De volledige offerte is als PDF en Excel bijgevoegd.</p>
        `,
        attachments: internalAttachments,
      });
    } else {
      const customerAttachments = [
        { filename: 'offerte-pharmaclean.pdf', content: pdfBuffer.toString('base64') },
      ];

      await Promise.all([
        // interne melding naar PharmaClean
        resend.emails.send({
          from: 'PharmaClean <offerte@pharmaclean.nl>',
          to: INTERN_EMAIL,
          reply_to: email,
          subject: `Nieuwe offerteaanvraag${praktijknaam ? ': ' + praktijknaam : ''}`,
          html: `
            <h2>Nieuwe offerteaanvraag via pharmaclean.nl</h2>
            <p><strong>Praktijk:</strong> ${praktijknaam || '-'}</p>
            <p><strong>E-mail aanvrager:</strong> ${email}</p>
            <p><strong>Telefoonnummer:</strong> ${telefoon}</p>
            ${itemsTableHtml}
            <p style="color:#5A6462;font-size:13px">De volledige offerte is als PDF en Excel bijgevoegd.</p>
          `,
          attachments: internalAttachments,
        }),
        // bevestiging met de offerte naar de aanvrager zelf
        resend.emails.send({
          from: 'PharmaClean <offerte@pharmaclean.nl>',
          to: email,
          reply_to: INTERN_EMAIL,
          subject: 'Uw offerte-indicatie van PharmaClean',
          html: `
            <h2>Bedankt voor uw aanvraag${praktijknaam ? ', ' + praktijknaam : ''}</h2>
            <p>Hierbij ontvangt u de indicatieve offerte die u zojuist heeft berekend op pharmaclean.nl. De volledige offerte is bijgevoegd als PDF.</p>
            ${itemsTableHtml}
            <p style="color:#5A6462;font-size:13px">Dit is een indicatieve prijs exclusief btw. Wij nemen binnen een werkdag contact met u op voor een definitieve offerte na een korte intake op locatie.</p>
            <p>Vragen? Antwoord gerust op deze e-mail, of bel ons op ${telefoon}.</p>
            <p>Met vriendelijke groet,<br>PharmaClean</p>
          `,
          attachments: customerAttachments,
        }),
      ]);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Versturen mislukt' });
  }
}

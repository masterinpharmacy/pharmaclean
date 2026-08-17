import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { totaal, perBeurt, frequentie, email, telefoon, praktijknaam } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Geldig e-mailadres verplicht' });
  }
  if (!telefoon) {
    return res.status(400).json({ error: 'Telefoonnummer verplicht' });
  }

  try {
    await resend.emails.send({
      from: 'PharmaClean <offerte@pharmaclean.nl>',
      to: 'info@pharmaclean.nl',
      reply_to: email,
      subject: `Nieuwe offerteaanvraag${praktijknaam ? ' — ' + praktijknaam : ''}`,
      html: `
        <h2>Nieuwe offerteaanvraag via pharmaclean.nl</h2>
        <p><strong>Indicatieve prijs:</strong> €${totaal} per maand</p>
        <p><strong>Details:</strong> ${perBeurt}</p>
        <p><strong>Frequentie:</strong> ${frequentie}</p>
        <p><strong>Praktijk:</strong> ${praktijknaam || '–'}</p>
        <p><strong>E-mail aanvrager:</strong> ${email}</p>
        <p><strong>Telefoonnummer:</strong> ${telefoon}</p>
      `
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Versturen mislukt' });
  }
}

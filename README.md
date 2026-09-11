# PharmaClean

Offertepagina voor pharmaclean.nl met live prijsberekening en offerteaanvraag via Resend.
Bij elke aanvraag wordt automatisch een offerte als PDF en Excel gegenereerd, inclusief logo
en mascotte, en als bijlage meegestuurd naar info@pharmaclean.nl.

## Structuur

- `index.html`: de volledige pagina (statisch, geen build-stap nodig)
- `api/offerte.js`: Vercel serverless functie die offerteaanvragen ontvangt, de documenten
  laat genereren en de mail met bijlagen verstuurt via Resend
- `api/quote-docs.js`: bouwt de offerte als PDF (pdfkit) en Excel (exceljs) op basis van de
  itemlijst die de frontend meestuurt, met logo en mascotte uit `api/assets/`
- `package.json`: bevat de dependencies (`resend`, `pdfkit`, `exceljs`)

## Deployen

Zie de handleiding "handleiding-pharmaclean-deployment.md" voor de volledige stap-voor-stap uitleg
(GitHub naar Vercel naar domein koppelen naar Resend instellen).

Kort samengevat:
1. Push deze repo naar GitHub
2. Importeer 'm in Vercel
3. Koppel `pharmaclean.nl` onder Settings, Domains
4. Zet `RESEND_API_KEY` als environment variable in Vercel (Settings, Environment Variables)
5. Verifieer `pharmaclean.nl` in Resend (Domains, Add Domain) zodat je vanaf `offerte@pharmaclean.nl` mag versturen

Vercel installeert `pdfkit` en `exceljs` automatisch bij het builden, dat vergt geen
extra configuratie.

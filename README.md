# PharmaClean

Offertepagina voor pharmaclean.nl met live prijsberekening en offerteaanvraag via Resend.

## Structuur

- `index.html` — de volledige pagina (statisch, geen build-stap nodig)
- `api/offerte.js` — Vercel serverless functie die offerteaanvragen via Resend verstuurt
- `package.json` — bevat de `resend` dependency voor de API-route

## Deployen

Zie de handleiding "handleiding-pharmaclean-deployment.md" voor de volledige stap-voor-stap uitleg
(GitHub → Vercel → domein koppelen → Resend instellen).

Kort samengevat:
1. Push deze repo naar GitHub
2. Importeer 'm in Vercel
3. Koppel `pharmaclean.nl` onder Settings → Domains
4. Zet `RESEND_API_KEY` als environment variable in Vercel (Settings → Environment Variables)
5. Verifieer `pharmaclean.nl` in Resend (Domains → Add Domain) zodat je vanaf `offerte@pharmaclean.nl` mag versturen

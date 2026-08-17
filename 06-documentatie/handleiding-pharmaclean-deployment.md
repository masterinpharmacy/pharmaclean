# Handleiding: PharmaClean live zetten met GitHub, Vercel en Resend

Deze handleiding gaat ervan uit dat je start met het HTML-bestand (`pharmaclean-offerte.html`) en het domein `pharmaclean.nl` al hebt geregistreerd. We doen drie dingen:

1. **GitHub** — code opslaan en versiebeheer
2. **Vercel** — hosten en domein koppelen
3. **Resend** — zodat "Vraag offerte aan" écht een e-mail verstuurt in plaats van een `mailto:`-link

---

## 0. Wat je nodig hebt

- Een GitHub-account
- Een Vercel-account (kan inloggen met GitHub)
- Een Resend-account ([resend.com](https://resend.com))
- Toegang tot het DNS-beheer van `pharmaclean.nl` (bij je domeinregistrar, bv. TransIP, Vimexx, Namecheap)
- Node.js geïnstalleerd op je computer (voor lokaal testen, niet strikt nodig)

---

## 1. Projectstructuur voorbereiden

Op dit moment is `pharmaclean-offerte.html` één los bestand met een `mailto:`-link. Om Resend te gebruiken heb je een klein **serverless functie** nodig (draait automatisch op Vercel). Zet de bestanden zo neer:

```
pharmaclean/
├── index.html          ← je huidige pharmaclean-offerte.html, hernoemd
├── api/
│   └── offerte.js       ← nieuwe serverless functie die de mail verstuurt
├── package.json
└── vercel.json           (optioneel, meestal niet nodig)
```

**package.json** (nieuw bestand, in de root):
```json
{
  "name": "pharmaclean",
  "version": "1.0.0",
  "dependencies": {
    "resend": "^4.0.0"
  }
}
```

**api/offerte.js** (nieuw bestand):
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { totaal, perBeurt, frequentie, email, praktijknaam } = req.body;

  try {
    await resend.emails.send({
      from: 'PharmaClean <offerte@pharmaclean.nl>',
      to: 'info@pharmaclean.nl',
      reply_to: email || undefined,
      subject: `Nieuwe offerteaanvraag${praktijknaam ? ' — ' + praktijknaam : ''}`,
      html: `
        <h2>Nieuwe offerteaanvraag via pharmaclean.nl</h2>
        <p><strong>Indicatieve prijs:</strong> €${totaal} per maand</p>
        <p><strong>Per beurt:</strong> €${perBeurt}</p>
        <p><strong>Frequentie:</strong> ${frequentie}</p>
        <p><strong>Praktijk:</strong> ${praktijknaam || '–'}</p>
        <p><strong>E-mail aanvrager:</strong> ${email || '–'}</p>
      `
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Versturen mislukt' });
  }
}
```

In je HTML vervang je de `vraagAan()`-functie (die nu een `mailto:` opent) door een `fetch`-aanroep naar deze route. Voeg ook een e-mailveld en eventueel praktijknaam-veld toe aan het formulier als je die gegevens wilt ontvangen. Voorbeeld:

```javascript
async function vraagAan(){
  const total = document.getElementById('total').textContent;
  const subInfo = document.getElementById('sub-info').textContent;

  try {
    const response = await fetch('/api/offerte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totaal: total,
        perBeurt: subInfo,
        frequentie: document.querySelector('.freq-opt.active').textContent,
        email: '',        // koppel aan een <input> als je die toevoegt
        praktijknaam: ''   // idem
      })
    });
    if (!response.ok) throw new Error('Versturen mislukt');
    alert('Bedankt! We nemen binnen één werkdag contact op.');
  } catch (err) {
    alert('Er ging iets mis. Probeer het opnieuw of mail naar info@pharmaclean.nl.');
  }
}
```

> Wil je dit liever niet zelf uitwerken? Zeg het en ik bouw de formuliervelden en de fetch-integratie meteen voor je in het bestand.

---

## 2. GitHub: code opslaan

1. Maak een nieuwe, lege repository aan op [github.com/new](https://github.com/new) — bijvoorbeeld `pharmaclean`. Zet 'm op **Private** als je de code niet openbaar wilt.
2. Open een terminal in je projectmap en voer uit:

```bash
cd pad/naar/pharmaclean
git init
git add .
git commit -m "Initial commit: PharmaClean offertepagina"
git branch -M main
git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/pharmaclean.git
git push -u origin main
```

Vanaf nu: elke keer als je iets aanpast, doe je:
```bash
git add .
git commit -m "Omschrijving van de wijziging"
git push
```

---

## 3. Vercel: hosten

1. Ga naar [vercel.com/new](https://vercel.com/new) en log in met GitHub.
2. Klik **Import** naast je `pharmaclean` repository.
3. Vercel herkent automatisch dat het een statische site + serverless functies is (dankzij de `api/` map). Laat de instellingen op standaard staan.
4. Klik **Deploy**. Na een paar seconden krijg je een tijdelijke URL zoals `pharmaclean.vercel.app` — check of alles werkt.

### Domein koppelen (pharmaclean.nl)

1. Ga in je Vercel-project naar **Settings → Domains**.
2. Voer `pharmaclean.nl` in en klik **Add**.
3. Vercel toont welke DNS-records je moet instellen. Meestal is dit:
   - **A-record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
   
   (Vercel toont de exacte, actuele waarden in het scherm zelf — gebruik die, ze kunnen wijzigen.)
4. Log in bij je domeinregistrar (waar je `pharmaclean.nl` hebt gekocht), ga naar DNS-beheer, en voeg deze records toe.
5. Wacht 10 minuten tot enkele uren (DNS-propagatie). Vercel geeft automatisch een groen vinkje zodra het domein actief is, én regelt gratis een SSL-certificaat (https).

---

## 4. Resend: e-mailverzending

### Domein verifiëren

1. Log in op [resend.com](https://resend.com) → **Domains** → **Add Domain** → voer `pharmaclean.nl` in.
2. Resend toont een aantal DNS-records (meestal 3-4: SPF (TXT), DKIM (TXT/CNAME), en optioneel een MX-record voor bounces).
3. Voeg deze records toe bij je domeinregistrar, net als bij Vercel.
4. Klik in Resend op **Verify** — dit kan even duren. Zodra geverifieerd, mag je vanaf elk adres op `@pharmaclean.nl` versturen (bv. `offerte@pharmaclean.nl`).

### API key aanmaken

1. Ga naar **API Keys** → **Create API Key**.
2. Geef 'm een naam (bv. "pharmaclean-productie") en kopieer de sleutel — je ziet 'm maar één keer.

### Sleutel toevoegen aan Vercel

1. Ga in je Vercel-project naar **Settings → Environment Variables**.
2. Voeg toe:
   - **Name**: `RESEND_API_KEY`
   - **Value**: (de sleutel die je net kopieerde)
   - **Environment**: Production (en eventueel Preview/Development)
3. Klik **Save**.
4. Belangrijk: na het toevoegen van een environment variable moet je opnieuw deployen (Vercel → **Deployments** → **...** → **Redeploy**) zodat de functie de sleutel kan gebruiken.

---

## 5. Testen

1. Vul het protocol op `pharmaclean.nl` in en klik **Vraag offerte aan**.
2. Check of het bericht binnenkomt op `info@pharmaclean.nl`.
3. Check in Resend onder **Logs** of de e-mail als "delivered" wordt gemarkeerd.

---

## Troubleshooting

| Probleem | Oplossing |
|---|---|
| Domein blijft "Invalid Configuration" in Vercel | DNS-wijzigingen kunnen tot 24 uur duren; controleer de records nogmaals met [dnschecker.org](https://dnschecker.org) |
| Resend-domein wil niet verifiëren | Check of je geen dubbele/conflicterende TXT-records hebt staan bij je registrar |
| E-mail komt niet aan | Check de Resend Logs eerst — vaak staat daar de exacte foutmelding (bv. verkeerd `from`-adres) |
| `RESEND_API_KEY is not defined` | Environment variable niet correct opgeslagen, of je hebt niet opnieuw gedeployed na het toevoegen |

---

Wil je dat ik de formuliervelden (e-mail, praktijknaam) en de fetch-integratie nu meteen in `pharmaclean-offerte.html` verwerk, zodat je alleen nog maar hoeft te pushen en te deployen?

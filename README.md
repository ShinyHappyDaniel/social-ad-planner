# SHP Social Ad Planner

Återanvändbart verktyg för att sammanställa planerade annonser (Meta, YouTube, TikTok) per kund och skicka till kund för godkännande innan uppladdning. Statisk webbapp, inget byggsteg, hostas på GitHub Pages.

**Live:** https://shinyhappydaniel.github.io/social-ad-planner/
**Kundvy:** lägg till `?client=<slug>`, t.ex. `?client=letsbridge`

## Funktioner

- Annonser grupperade per plattform med faux ad-preview (rubrik, primary text, CTA, thumbnail, metadata)
- Fält per annons: plattform, placering, kampanj, mål/funnel, audience/targeting, region, språk, format, rubrik, primary text, CTA, URL, creative-asset (uppladdad thumbnail eller länk), budget, schema, status, godkännare, kundkommentar, interna anteckningar
- Teckenräknare med plattformsgränser (t.ex. Meta primary text 125 tecken)
- Status: Utkast / Redo för granskning / Godkänd / Ändring begärd
- Översikt med räknare + sign-off-rad för kund
- Light / dark mode i gråskala, SHP-logga (rosa i light, vit i dark)
- Filter (plattform/status), kort- och tabellvy
- Skriv ut / PDF, Export/Import JSON

## Data

Varje kund = `data/<slug>.json`. Kundlistan = `data/index.json`. Redigering sker i webbläsaren (sparas i localStorage), och **Spara** committar till repot via GitHubs API så live-länken uppdateras.

### Spara till GitHub (token)

"Spara" kräver en **fine-grained personal access token** med **Contents: Read and write** på just detta repo. Skapa den på https://github.com/settings/personal-access-tokens/new . Token lagras lokalt i webbläsaren (localStorage), aldrig i repot, och kan återkallas när som helst. Fallback: Exportera/Importera JSON.

## Typsnitt & logga

Red Hat Mono Light (rubriker, all-caps) + Red Hat Text (brödtext), buntade i `assets/fonts/`. SHP-loggor i `assets/logos/`. Från Shiny Happy People brand guidelines.

## Lokalt

```
cd social-ad-planner
python3 -m http.server 8000
# öppna http://localhost:8000/?client=letsbridge
```
(Öppna inte via `file://` — `fetch` av JSON kräver en webbserver.)

# Split-Second Design System — Referenz für Seiten-Redesigns

Diese Datei ist die Kurzreferenz für alle Seiten, die noch ins "Split-Second"-Redesign
überführt werden. Bereits fertig im Zielstil: `index.html`, `crossfit.html` (jetzt "Fitness"),
`kalender.html`, `uebungen.html`, `challenge.html`, `ranking.html`, `profile.html`,
`impressum.html`, `datenschutz.html`. **Lies mindestens 1-2 davon komplett, bevor du
loslegst** — diese Referenz ist eine Abkürzung, kein Ersatz dafür.

## Nicht verhandelbar

1. **Nur Optik ändern, nie Funktion.** Jede JS-Funktion, jede Element-ID, auf die JS zugreift
   (`getElementById`, Formular-Felder, Event-Listener), jeder `localStorage`-Key, jeder
   Supabase-Tabellen-/Spaltenname, jeder RPC-Aufruf bleibt exakt wie er ist. Nur HTML-Struktur
   (Klassen, Layout, Wrapper) und CSS werden neu gebaut.
2. **Lies zuerst `DATENVERTRAG.md`** im Repo-Root — dort stehen die konkreten Tabellen/Spalten/
   IDs, die nicht angefasst werden dürfen, pro Seite.
3. Wenn eine Seite JS enthält, das DOM-Elemente per Klassenname anspricht (nicht nur ID) —
   z.B. `document.querySelectorAll('.irgendwas')` — diese Klassennamen ebenfalls beibehalten
   oder das JS entsprechend mitziehen. Im Zweifel: Klassennamen aus dem Original übernehmen,
   auch wenn sie nicht ins neue Namensschema passen.
4. **CrossFit → Fitness/Kraftprobe:** falls die Seite "CrossFit" irgendwo sichtbar erwähnt,
   in der Nav/Breadcrumb "Fitness" schreiben, in Hero-artigen Stellen ggf. "Kraftprobe" (siehe
   `crossfit.html`). Der Dateiname `crossfit.html` und alle `href="crossfit.html"` bleiben
   unverändert.
5. Kein "Side Plank" oder andere hart codierte Einzel-Übungen als Beispiel — falls sowas im
   Originaltext auftaucht, generisch umformulieren oder (wenn ohnehin schon Live-Daten aus
   Supabase geladen werden) an die echten Daten binden.

## Design-Tokens (exakt aus crossfit.html übernehmen)

```css
:root, [data-theme="dark"]{
  --bg:#121214;--ink:#f2f0ec;--accent:#ff453a;--accent-text:#ff453a;--muted:#c4c2bc;--faint:#8f8d8a;--line:#2a2a2e;
  --ease-out:cubic-bezier(.23,1,.32,1);--ease:cubic-bezier(.4,0,.2,1);
  color-scheme:dark;
}
[data-theme="light"]{
  --bg:#f7f5f0;--ink:#14141a;--accent:#e8231b;--accent-text:#d01f18;--muted:#4a4a52;--faint:#6b6860;--line:#d8d5cc;
  color-scheme:light;
}
```

**Fonts** (Google Fonts, gleicher Link auf jeder Seite):
```html
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```
- `'Big Shoulders Display'` (700/800) — alle Headlines, große Zahlen, Buttons. IMMER
  `text-transform:uppercase`, enge `line-height` (~.9-1), `letter-spacing` leicht negativ bis 0.
- `'Work Sans'` — Fließtext/Body.
- `'IBM Plex Mono'` — Labels, Nav, Breadcrumbs, Tags, kleine UI-Texte. Immer
  `text-transform:uppercase; letter-spacing:.1em+`.

**Theme-Toggle-Script** (identisch auf jeder Seite, localStorage-Key `om_cf_theme` — MUSS
site-weit gleich bleiben, damit die Theme-Wahl seitenübergreifend synchron ist):
```js
const THEME_KEY='om_cf_theme';
const html=document.documentElement;
const themeToggle=document.getElementById('themeToggle');
function applyTheme(t){
  html.setAttribute('data-theme',t);
  themeToggle.textContent=t==='dark'?'Light':'Dark';
  localStorage.setItem(THEME_KEY,t);
}
applyTheme(localStorage.getItem(THEME_KEY)||'dark');
themeToggle.addEventListener('click',()=>{
  applyTheme(html.getAttribute('data-theme')==='dark'?'light':'dark');
});
```
`<html lang="de" data-theme="dark">` im Root-Tag nicht vergessen.

## Wiederkehrende Bausteine (aus den fertigen Seiten kopieren, nicht neu erfinden)

- **Nav**: sticky, `background:color-mix(in srgb,var(--bg) 88%,transparent)`, `backdrop-filter:blur(10px)`,
  `border-bottom:1px solid var(--line)`. Breadcrumb links: `← OM / <seitenname>` in
  IBM Plex Mono. Theme-Toggle-Button rechts. Bei Seiten mit Login-Bezug (die meisten): das
  komplette Account-Widget aus `crossfit.html` (`.acct`, `.acct-chip`, `.acct-menu`, das ganze
  `<script>`-Block am Seitenende dafür) 1:1 übernehmen inkl. `SB_URL`/`SB_KEY`/`sbFetch`.
  Bei reinen Text-/Tool-Seiten ohne Login-Bezug (wie `impressum.html`) reicht ein simpler Nav
  ohne Account-Widget.
- **`.sheet-top`**: schmale Meta-Zeile über dem `<h1>` (Kontext + Datum/Saison), IBM Plex Mono,
  `border-bottom:1px solid var(--line)`.
- **`.page-title`/`.hero-title`**: große Big-Shoulders-Display-Headline, ggf. mit `.cut`-Span
  in `var(--accent)` für ein zweifarbiges Wort.
- **`.idx-row`** (Listen/Index-Einträge, z.B. Übersicht mehrerer Unterbereiche): siehe
  `crossfit.html` `.idx-row`/`.idx-title`/`.idx-note`/`.idx-desc`/`.idx-arrow` — Grid
  `64px 1fr auto`, Hover verschiebt den Pfeil, Titel bekommt Unterstrich-Animation.
- **Formulare** (Eingabefelder, Buttons): siehe `challenge.html` `.form-group`/`.form-label`/
  `.form-input`/`.form-btn` — Inputs mit `border:1px solid var(--line)`, Fokus/Hover
  `border-color:var(--accent)`, Buttons in `var(--accent)` mit weißem Text, Hover
  `var(--accent-text)`.
- **Tabs/Auth-artige Umschalter**: siehe `profile.html` `.auth-tabs`.
- **Footer**: `max-width` passend zur Seite, `border-top:1px solid var(--line)`, zentrierte
  IBM-Plex-Mono-Links, `© 2026 onlymakkus.de · Impressum · Datenschutz · made with pain & supabase`.
- **Responsive**: `@media(max-width:560px)` verkleinert Nav-Padding, Grid-Spalten der
  Index-Zeilen, blendet `.idx-arrow` aus. Immer mobile-first-tauglich testen.

## Vorgehen pro Seite

1. Alte Seite (aktuelle Funktion) lesen und verstehen: welche IDs/Klassen greift das JS ab?
   Welche Supabase-Calls gibt es? Was macht die Seite inhaltlich?
2. `DATENVERTRAG.md` für diese Seite querlesen.
3. Neu aufbauen: `<head>` (Fonts, Tokens wie oben), Nav (mit/ohne Account-Widget je nach
   Kontext), Inhalt mit den Bausteinen oben neu gestylt, Footer, Theme-Toggle-Script.
4. JS-Logik 1:1 übernehmen (copy-paste aus dem Original), nur so viel anpassen, dass es zu
   neuen Klassennamen passt, falls du welche geändert hast (lieber nicht ändern).
5. Im Browser gegen `http://localhost:8101/<seite>.html` (Server läuft bereits) testen:
   Seite lädt ohne Konsolenfehler, alle interaktiven Elemente (Formulare, Buttons, Tabs)
   funktionieren, Theme-Toggle funktioniert, Nav-Links stimmen.

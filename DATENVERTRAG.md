# DATENVERTRAG — onlymakkus.de

Dieses Dokument ist die verbindliche Referenz für alles, was beim Redesign **nicht** angefasst werden darf: Tabellen, Spalten, RPC-Aufrufe, `localStorage`-Keys, zur Laufzeit gelesene CSS-Variablen und Element-IDs, an die Spiellogik gebunden ist.

Erstellt durch vollständigen Scan von `C:\Users\marku\GamesClaude\onlymakkus` (Branch `redesign-concept`, 116 Dateien). **Wichtiger Vorbehalt:** Ich hatte in dieser Session **keinen Zugriff auf das Supabase-Dashboard oder eine SQL-Konsole** — alles hier stammt aus dem Client-Code (HTML/JS). RLS-Policies, GRANTs, Trigger-Definitionen, `pg_cron`-Zeitpläne und die vollständigen Tabellenschemas (inkl. Spalten, die aktuell von keiner Seite gelesen/geschrieben werden) sind serverseitig und nicht aus dem Client ableitbar. Diese Stellen sind unten explizit als **[UNVERIFIZIERT]** markiert. Siehe Abschnitt 6.

Supabase-Projekt (konsistent in allen Dateien): `https://bsubsesbcxdaqofmkiqg.supabase.co`, Anon-Key `sb_publishable_fA2Dca6SVp0eB8k_WuqLrw_zplTnXBU`.

---

## 0. Bestehender Redesign-Stand (wichtig für Schritt 2!)

Bevor irgendetwas Neues gebaut wird: Dieses Repo hat **bereits zwei Redesign-Versuche** in eigenen Branches, beide mit denselben 7 Seiten (`index`, `kalender`, `uebungen`, `crossfit`, `challenge`, `ranking`, `profile`):

- **`redesign-v2`** — 7 Commits `redesign: <seite>.html`, direkt auf `main` aufgesetzt.
- **`redesign-concept`** (aktueller Branch) — 7 Commits `concept: <seite>.html — Split-Second direction`, plus mehrere Fix-Commits danach (Kontrast, Motion, Nav-Ghosting). Dieser Branch hat einen eigenen Namen für die Richtung: **„Split-Second"**.
- Unstaged auf `redesign-concept`: eine inhaltliche Änderung (Pinball-Spiel zu `gaming.html`/`snake.html` hinzugefügt) — hat nichts mit Redesign zu tun, sollte separat committet werden.

Der neue Prompt verlangt ausdrücklich „2–3 grundverschiedene visuelle Richtungen" **ohne** Rückgriff auf Bestehendes. Das kollidiert mit dem Umstand, dass „Split-Second" bereits auf 7 von ~25 Seiten umgesetzt ist. Ich frage das im Chat separat ab, bevor ich Schritt 2 beginne.

---

## 1. Supabase-Tabellen (aus REST-Aufrufen `/rest/v1/<table>` rekonstruiert)

Format: Tabelle — Spalten, die irgendwo gelesen ODER geschrieben werden — verwendende Seiten.

### `profiles`
- Spalten: `id`, `name`, `discriminator` (nullable — Klarname kann mehrfach vorkommen), `display_name`, `password_hash` (bcrypt, clientseitig via `dcodeIO.bcrypt`, CDN `bcryptjs@2.4.3`), `recovery_code_hash` (bcrypt), `avatar_url`, `created_at`.
- Geplant, UI bereits vorbereitet, **aktuell nirgends geschrieben** (Graceful-Degradation über `s.level!=null` etc. — siehe Abschnitt 4): `level`, `xp`, `xp_next` (Client-Feldname `xpNext`), `title`.
- Verwendet in: `profile.html` (Login/Registrierung/Passwort/Recovery/Avatar/Anzeigename), `admin.html` (Profilverwaltung, Passwort-Reset, Löschen), `crossfit.html`, `kalender.html`, `ranking.html`.
- Identität wird **immer über `id`** geprüft, nie über `name` (bestätigt).

### `challenge_entries`
- Spalten: `id`, `challenge` (Slug/Text, kein FK — wird clientseitig aus Übungsnamen per `slugify()` erzeugt), `season_month_id`, `profile_id` (nullable), `pin_hash` (Legacy-Auth vor Profilsystem, noch aktiv für Alt-Einträge ohne `profile_id`), `name`, `value1`, `value2` (nullable, nur bei „dual"-Übungen wie Links/Rechts), `completed_ts`, `last_progress_ts`.
- Tiebreaker (bestätigt im Code, `ranking.html`/`admin.html`): `value1` absteigend → `last_progress_ts` aufsteigend → `id` aufsteigend.
- Verwendet in: `challenge.html`, `crossfit.html`, `ranking.html`, `admin.html`.

### `challenge_entry_history`
- Spalten (nur gelesen, nie geschrieben — wird per DB-Trigger befüllt): `id`, `changed_at`, `name`, `challenge`, `old_value1`, `new_value1`, `change_amount`.
- Trigger-Name laut Projektnotizen: `log_challenge_entry_change` (SECURITY DEFINER) — **[UNVERIFIZIERT]**, im Client-Code nicht sichtbar, nur das Ergebnis (die Tabelle) wird gelesen.
- Verwendet in: `admin.html` (paginierte Historie via `Prefer: count=exact` + `Range`-Header, 200er-Seiten).

### `season_months`
- Spalten: `id`, `season_year`, `month` (1–12), `exercise_id`, `is_december_vote` (bool), `custom_goal` (nullable, überschreibt Standardziel der Übung).
- Verwendet in: `challenge.html`, `crossfit.html`, `kalender.html`, `uebungen.html`, `admin.html`.

### `seasons`
- Spalten (nur `year` genutzt): `year`.
- Verwendet in: `admin.html`.

### `exercises`
- Spalten: `id`, `name`, `description`, `category`, `equipment`, `default_dual` (bool), `default_unit`, vermutlich `default_goal`/Zielwert (Adminseite hat „Ziel überschreiben" pro Monat — Basiswert kommt aus dieser Tabelle, exakter Spaltenname nicht in dieser Session verifiziert — **[UNVERIFIZIERT, Spaltenname]**).
- Verwendet in: `uebungen.html`, `crossfit.html`, `admin.html`, `kalender.html`.

### `season_ranking` (Basistabelle) / `v_season_ranking` (View)
- Admin liest/schreibt `season_ranking` direkt; `profile.html` und `ranking.html` lesen ausschließlich die View `v_season_ranking`.
- Exakte Spalten **[UNVERIFIZIERT]** über Client-Code hinaus (nur `select=*` verwendet).

### `season_results` / `v_month_results` (View)
- Admin verwaltet `season_results`; `ranking.html` liest `v_month_results`.
- Exakte Spalten **[UNVERIFIZIERT]**.

### `v_profile_history` (View)
- Gelesen in `challenge.html`, `profile.html`. Vermutlich Join über `challenge_entries` + `profiles` + `season_months`. Exakte Definition **[UNVERIFIZIERT]**.

### `december_votes`
- Spalten: `id`, `season_year`, `profile_id`, `exercise_id`.
- Verwendet in: `crossfit.html` (Abstimmen, Ergebnis anzeigen), `admin.html`.
- **Keine dedizierten RPC-Funktionen** (`december_vote_options()`/`december_vote_result()` aus den Projektnotizen kommen im Client-Code **nicht vor** — die Seiten fragen die Tabelle direkt per REST-Filter ab). Sichtbarkeitsfenster 5.–30. November ist reine Client-Logik in `crossfit.html`.

### `achievements`
- Spalten: `id`, `profile_id`, `code`, `unlocked_at`.
- Verwendet in: `profile.html` (Anzeige, `grant_achievements()`-Aufruf), `admin.html` (manuelles Vergeben/Entziehen/Filtern, `achGrantCode`-Freitextfeld mit Autocomplete aus vorhandenen Codes).
- 21 Achievements über Kategorien Fitness/Gaming/Crossover laut Projektnotizen — Kategorie-Zuordnung liegt clientseitig in `profile.html` (`CAT_LABELS`-artige Konstanten), nicht in der DB-Zeile selbst.

### `daily_log`
- Spalten: `profile_id`, `datum` (Datumsspalte, deutscher Name — **kein** `date`).
- Verwendet in: `challenge.html` (Streak-Tracking via RPC), `admin.html` (Streak-Übersicht liest die Tabelle direkt).

### `body_metrics_entries`
- Spalten: `id`, `profile_id`, `date`, `weight`, `taille`, `huefte`, `brust`, `arm`, `bein` (aus `METRICS`-Array in `koerpertracker.html`; alle nullable außer `weight`/`date`/`profile_id`/`id`).
- Verwendet in: `koerpertracker.html` (einziger Verwender).

### `body_metrics_goal`
- Spalten: `profile_id` (PK/unique), `weight_goal_kg`.
- Verwendet in: `koerpertracker.html`.

### `calorie_settings`
- Spalten: `profile_id`, `daily_goal`, `protein_goal`, `fat_goal`, `carb_goal`.
- Verwendet in: `tracker.html`.

### `calorie_quick_foods`
- Spalten: `id`, `profile_id`, `name`, `kcal_100`, `protein_100`, `fat_100`, `carb_100`, `fixed_kcal`, `fixed_protein`, `fixed_fat`, `fixed_carb`, `default_grams`.
- Verwendet in: `tracker.html`.

### `calorie_entries`
- Spalten: `id`, `profile_id`, `date`, `name`, `grams`, `kcal`, `protein`, `fat`, `carb`, `created_at`.
- Verwendet in: `tracker.html`.

### `snake_scores`
- Spalten: `id` (implizit), `name`, `score`, `profile_id` (nullable).
- **Geteilte Highscore-Tabelle für ALLE Arcade-Spiele**, nicht separate Tabellen pro Spiel (Projektnotizen-Vermutung „scores“ war falsch — es ist tatsächlich `snake_scores`, historisch benannt, aber von 5 Spielen genutzt). Präfix-Konvention im `name`-Feld unterscheidet Spiele bei gemeinsamer Abfrage: `BB:` (Blockblast), `TT:` (Tetris), `FB:` (Flappy), `PB:` (Pinball), kein Präfix (Snake selbst). Snake filtert beim Laden explizit `name=not.like.BB:*` etc. heraus, um nur eigene Scores zu zeigen — **wird bei jedem neuen Spiel-Präfix erweitert, siehe unstaged Diff für `PB:`**.
- Verwendet in: `snake.html`, `tetris.html`, `flappy.html`, `blockblast.html`, `pinball.html`.

### `game_meta_progress`
- Spalten: `profile_id`, `game_key`, `data` (jsonb), `updated_at`. Unique Constraint über `(profile_id, game_key)` (Upsert via `on_conflict=profile_id,game_key`, `Prefer: resolution=merge-duplicates`).
- **Existiert bereits** (entgegen „Stand unklar" in den Projektnotizen) und wird aktiv genutzt.
- Verwendet in: `schwarmkern.html` (`MetaStore`-Abstraktion, mit `localStorage`-Fallback `meta:${gameKey}` wenn kein Profil eingeloggt oder Request fehlschlägt).

---

## 2. RPC-Funktionen (`/rest/v1/rpc/<fn>`)

| Funktion | Parameter | Aufrufende Seite | Verwendung des Rückgabewerts |
|---|---|---|---|
| `current_daily_streak` | `p_profile_id` | `challenge.html` | Zahl, angezeigt als aktueller Streak |
| `longest_daily_streak` | `p_profile_id` | `challenge.html` | Zahl, angezeigt als Rekord-Streak |
| `log_active_day` | `p_profile_id` | `challenge.html` | `Prefer: return=minimal` — kein Rückgabewert genutzt, Fire-and-forget beim Laden |
| `grant_achievements` | `{}` (keine Parameter) | `profile.html` | `Prefer: return=minimal` — **aktuell wird nichts zurückgegeben/verarbeitet**; Projektnotiz „soll künftig neu freigeschaltete Codes zurückgeben" ist noch nicht umgesetzt — reiner Fire-and-forget-Aufruf beim Öffnen von `profile.html` |
| `finalize_last_month` | `{}` | `ranking.html` | Fire-and-forget beim Laden — **wichtig:** dieser RPC-Name weicht von der Projektnotiz `finalize_december_vote` ab. Ob es zusätzlich einen separaten, nur per `pg_cron` laufenden `finalize_december_vote` gibt, ist **[UNVERIFIZIERT]** |

Zusätzlich: `admin.html` hat eine generische RPC-Aufruf-Funktion (`rpcTry`, Zeile ~1056), die versucht, eine Funktion mit mehreren Parameter-Varianten aufzurufen (z. B. `{p_profile_id}`, `{profile_id}`, `{}`) und den ersten Erfolg nimmt — Fallback-Mechanismus, kein zusätzlicher Funktionsname. `admin.html` liest außerdem dynamisch die OpenAPI-Spec von PostgREST (`spec.paths`), um verfügbare RPC-Namen aufzulisten — das ist die verlässlichste Quelle für „alle tatsächlich existierenden RPCs", aber nur zur Laufzeit gegen die echte DB abrufbar, nicht aus dem Quellcode.

---

## 3. `localStorage`-Keys

| Key | Struktur | Geltungsbereich |
|---|---|---|
| `om_profile_session` | `{id, name, discriminator, displayName, avatarUrl}` (+ optional zukünftig `level`, `xp`, `xpNext`, `title` — siehe Abschnitt 4) | **Global**, seitenübergreifend — das ist die eigentliche Session. Gesetzt/gelesen in praktisch jeder Seite. |
| `om_cf_theme` | `'dark'` \| `'light'` (String) | Global, Theme-Toggle. Auf manchen Seiten `THEME_KEY`, auf `admin.html`/`zuletzt-freigeschaltet.html` `KEY` genannt — **derselbe String-Wert** `'om_cf_theme'`. |
| `bb_hi` / `bb_name` | Zahl (String) / String | Blockblast, nur ohne Login-Session relevant (Highscore/Name-Fallback) |
| `sn_hi` / `sn_name` | wie oben | Snake |
| `tt_hi` / `tt_name` | wie oben | Tetris |
| `fb_hi` / `fb_name` | wie oben | Flappy |
| `pinball:best` / `pinball:name` / `pinball:muted` | Zahl / String / `'0'`\|`'1'` | Pinball |
| `schwarmkern:muted` / `schwarmkern:aimMode` | `'0'`\|`'1'` / `'auto'`\|`'manual'` | Schwarmkern |
| `meta:${gameKey}` | JSON (Spiel-Metafortschritt) | Schwarmkern — **Fallback**, wenn `game_meta_progress` nicht erreichbar ist oder kein Profil eingeloggt ist |
| `wl_stats` | `{played, won, streak, best}` | Wordle |
| `wl_state_<dayIdx>` | `{board, curR, curC, over, rev}` | Wordle, ein Key pro Tages-Puzzle |
| `funke_save_v1` | Spielstand-Objekt (`node`, `inventory[]`, `visitedNodes[]`, `flags{}`, …) | Funke (Textadventure) — **komplett lokal, keine Supabase-Anbindung** |
| `funke_sound_muted` | `'0'`\|`'1'` | Funke |

---

## 4. CSS Custom Properties, die zur Laufzeit per JavaScript gelesen werden

**Einzige Fundstelle im gesamten Repo:** `koerpertracker.html`, Zeilen 715–718:
```js
const cs = getComputedStyle(htmlEl);
const rust = cs.getPropertyValue('--rust').trim();
const textDim = cs.getPropertyValue('--text-dim').trim();
const lineCol = cs.getPropertyValue('--line').trim();
```
Diese drei Werte werden direkt als Chart.js-Farben (Linie, Achsenbeschriftung, Gitterlinien) verwendet. **`--rust`, `--text-dim` und `--line` müssen als Token-Namen erhalten bleiben**, auch wenn sich ihre Farbwerte ändern — die Datei selbst hat dazu bereits einen Kommentar (Zeile 12): „Token-Namen bleiben (das Chart-JS liest --rust/--text-dim/--line zur Laufzeit)". Kein anderer Ort im Repo liest CSS-Variablen programmatisch aus.

Zusätzlich, nicht CSS-basiert, aber dieselbe Kategorie „vom Client aus DB-Werten befüllte optionale Felder": das Account-Widget (siehe unten) blendet `level`/`xp`/`xpNext`/`title` nur ein, wenn sie in der Session vorhanden sind (`s.level!=null`, `s.xp!=null&&s.xpNext!=null`, `s.title`) — diese Felder werden aber **derzeit von keiner Seite in die Session geschrieben** (weder aus `profiles`-Spalten noch anderswo), sind also faktisch immer `undefined`/versteckt. Diese Graceful-Degradation-Logik ist identisch auf ca. 15 Seiten dupliziert und muss erhalten bleiben.

---

## 5. Element-IDs, an die JavaScript gebunden ist

### Seitenübergreifendes „Account-Widget" (auf ~15 Seiten identisch dupliziert)
IDs: `acct`, `acctLogin`, `acctChip`, `acctMenu`, `acctName`, `acctMenuName`, `acctAv`, `acctAvLg`, `acctLvl`, `acctMenuTitle`, `acctXp`, `acctXpLabel`, `acctXpVal`, `acctXpFill`, `acctLogout` (im Code teils `lo` genannt). Jede neu gestaltete Seite mit Login-Anzeige muss **alle** diese IDs enthalten (auch wenn manche `hidden` sind), sonst wirft das Skript beim Setzen von `.textContent`/`.hidden` auf `null`.

### Login-/Session-Variablen (Namensinkonsistenz beachten)
Verschiedene Dateien nennen dieselbe Variable unterschiedlich (`SESS`, `SESSION_KEY`) — das ist eine reine Variablennamens-Inkonsistenz im Code, **nicht** relevant fürs Redesign, da beide denselben `localStorage`-Key `'om_profile_session'` referenzieren.

### Custom-Cursor-Element `#cursor`
Vorhanden (mit `class="cursor"`) in: `datenschutz.html`, `impressum.html`, `flappy.html`, `blockblast.html`, `pinball.html`, `schwarmkern.html`, `tetris.html`, `snake.html`, `wordle.html`.
**Nicht** vorhanden in den bereits redesignten „Split-Second"-Seiten (`index`, `kalender`, `uebungen`, `crossfit`, `challenge`, `ranking`, `profile`) — dort wurde der Custom-Cursor im vorherigen Redesign-Durchlauf bereits bewusst entfernt (samt der zugehörigen `document.getElementById('cursor')`-Aufrufe). Funktional: rein dekorativ (folgt der Maus, vergrößert sich über Links/Buttons via `mouseenter`/`mouseleave`), **keine Spiellogik hängt daran** — aber der JS-Zugriff erfolgt ohne Null-Check, d. h. ein fehlendes `#cursor`-Div wirft bei jeder Mausbewegung einen Fehler in der Konsole. Entscheidung pro Seite nötig: Div behalten (auch wenn per CSS ausgeblendet) oder den zugehörigen JS-Block mit entfernen.

### Canvas- und Spiel-IDs (spielspezifisch, nicht seitenübergreifend)
Jedes Arcade-Spiel (`snake.html`, `tetris.html`, `flappy.html`, `blockblast.html`, `pinball.html`, `schwarmkern.html`, `wordle.html`) hat sein eigenes, in sich geschlossenes Set an IDs für Canvas, Score-Anzeige, Game-Over-Overlay, Namensfeld (`go-name`), Speichern-Button. Diese wurden in dieser Session nicht Zeile für Zeile dediziert erfasst (Umfang), sind aber beim Umbau jeder Spielseite individuell gegen das jeweilige `<script>` zu prüfen — der Prompt verlangt das ohnehin pro Seite in Schritt 4 (ID-Diff gegen Original).

### Avatar-Upload
Supabase Storage Bucket **`avatars`**, Objektpfad `{profile_id}.jpg`, öffentliche URL `.../storage/v1/object/public/avatars/{id}.jpg?t=...`. Kein Datenbank-Feld, sondern Storage — bei Bucket-Umbenennung oder Pfadänderung bricht der Avatar-Upload in `profile.html` (Zeile ~1082–1096).

---

## 6. Offene Punkte — Bedarf an Supabase-Dashboard-/SQL-Zugriff

Diese Punkte konnte ich **nicht** aus dem Client-Code verifizieren und sollten vor dem Redesign (oder zumindest vor dem Löschen/Umbenennen irgendeiner Spalte) im Supabase-Dashboard oder per SQL gegen `information_schema` geprüft werden:

1. **RLS-Policies und GRANTs** pro Tabelle — der Prompt verlangt explizit „RLS-Policy + `GRANT ... TO anon`" pro Tabelle als Pflicht-Check. Aus dem Client kann ich nur sehen, dass die Aufrufe aktuell funktionieren (Grants also vorhanden sein müssen), aber nicht ihren genauen Zustand.
2. **Trigger `log_challenge_entry_change`** — Existenz/Name nur aus Projektnotizen, nicht aus Client-Code bestätigt (die Zieltabelle `challenge_entry_history` wird aber definitiv befüllt und gelesen).
3. **`pg_cron`-Job für Dezember-Voting** — ob er `finalize_last_month` (den ich im Client als RPC gefunden habe) oder eine separate serverseitige Funktion `finalize_december_vote` aufruft.
4. **Vollständige Spaltenlisten** von `exercises`, `season_ranking`, `season_results`, `v_profile_history`, `v_season_ranking`, `v_month_results` — ich kenne nur die Spalten, die der Client tatsächlich per Name anspricht (`select=*` verschleiert den Rest).
5. **`profiles.level`/`xp`/`xp_next`/`title`** — ob diese Spalten in der DB schon existieren (nur noch nicht befüllt) oder komplett fehlen. Ändert, ob das künftige Freischalten dieser Felder eine Migration braucht oder nur Client-Code.

Ich habe in dieser Session keinen Supabase-Zugriff (keine Dashboard-Session, kein Service-Role-Key) — falls gewünscht, bitte Zugangsdaten oder Dashboard-Zugriff bereitstellen, dann trage ich diese Punkte nach.

---

## 7. Sonstige Seiten ohne Backend-Anbindung (zur Vollständigkeit)

- `nbnp.html` — statische Content-Seite („No box. No problem." — 2-Wochen-WOD-Paket), kein Supabase, kein `localStorage`, kein `#cursor`.
- `wochenplan.html`, `health.html` (bis auf Account-Widget/Theme), `datenschutz.html`, `impressum.html` — überwiegend statisch, aber `datenschutz.html`/`impressum.html` haben das `#cursor`-Element.
- `funke.html` — siehe Abschnitt 3, rein lokal gespeichert. **Bewusste Design-Entscheidung nötig** (siehe Prompt „Sonderfälle"): grüner CRT-Terminal-Look aktuell im Story-Kontext begründet — ob das im neuen System weiterlebt, ist eine offene Design-Entscheidung, keine Datenschicht-Frage.

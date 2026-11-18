# 💊 PillenPfad

**▶ Live ausprobieren: https://aribeck.github.io/pillenpfad/**

Eine kleine Lern-App, mit der Pflegekräfte die wichtigsten Medikamente lernen – in kurzen Lektionen, mit Quiz, Punkten, Tages-Serie und dem Maskottchen **Kapsi**.

> ⚠️ **Hinweis:** PillenPfad ist eine Lernhilfe. Die Inhalte sind vereinfacht und ersetzen keine Fachinformation, ärztliche Anordnung oder Rücksprache mit der Apotheke. Dosierungen sind bewusst nicht enthalten.

## Inhalt

- **15 Stationen, 99 Medikamente, 45 Lektionen** – Schmerz, Gerinnung, Herz-Kreislauf, Diabetes, Magen-Darm, Infektionen, Atemwege, Psyche, Neurologie, Hormone, Notfall u. a.
- Jede Karte: Wirkstoff, Handelsname (Beispiel), Gruppe, Einsatz, Wirkung, Nebenwirkungen, **Pflege-Tipps**
- Übungstypen: Multiple Choice, „Stimmt das?“, Paare zuordnen, Endungs-Detektiv (z. B. *-pril* → ACE-Hemmer)
- Lexikon mit Suche, Training für schwache Medikamente, Fortschritt im Browser gespeichert
- Einnahme- und Anwendungshinweise wurden im November 2026 mit Fachinformationen aus der Gelben Liste abgeglichen

## Projektstruktur

```
src/
  data.js        Inhalte (Stationen + Medikamentenkarten)
  engine.js      Lern-Engine: Lektionen und Quizfragen erzeugen
  app.js         Oberfläche (Lernpfad, Lektionen, Lexikon, Profil)
  style.css      Design „Klinik-Frisch“
  template.html  HTML-Gerüst
build.py         baut alles zu einer einzigen index.html zusammen
index.html       fertige App – einfach im Browser öffnen
tests/           Test der Quiz-Engine (node tests/quiz-engine.test.js)
```

## Starten

`index.html` im Browser öffnen – fertig. Nach Änderungen in `src/`:

```bash
python3 build.py
node tests/quiz-engine.test.js
```

## Neues Medikament hinzufügen

In `src/data.js` bei der passenden Station einen Eintrag ergänzen:

```js
{ n: "Wirkstoff", b: "Handelsname", g: "Gruppe",
  u: ["Einsatz 1", "Einsatz 2"], w: "Wirkung in einem Satz",
  nw: ["Nebenwirkung 1", "Nebenwirkung 2"], p: ["Pflege-Tipp 1", "Pflege-Tipp 2"],
  uq: "Kurzform Einsatz", nq: "Typische Nebenwirkung", pq: "Wichtigster Pflege-Tipp" }
```

Dann `python3 build.py` ausführen. Die Lektionen werden automatisch neu aufgeteilt.

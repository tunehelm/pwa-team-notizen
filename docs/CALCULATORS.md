# Pro ICU Calculator Smart Blocks

## Medizinischer Hinweis

Alle Berechnungen dienen ausschließlich der klinischen Orientierung und ersetzen keine ärztliche Beurteilung oder lokale SOP.

---

## Aktueller Stand (Auto-Update)

### Unterstützte Rechner

- **Dantrolen (Agilus)** – Zweck: Dosisberechnung bei maligner Hyperthermie (2,5 mg/kg, max. 300 mg). Inputs: Gewicht (kg). Outputs: Dosis (mg), Volumen (ml), Vials. Besonderheiten: 120 mg/Vial, 22,6 ml Endvolumen.
- **Isofluran ICU Rechner (PRO V4)** – Zweck: strukturierte MAC-Näherung und Verbrauchsschätzung für Isofluran-Sedierung. Inputs: Gewicht, Alter, Temp, MV, RASS/MAC-Ziel, Opioid/Mida/Prop/Dex (ml/h + Konzentration), Alkohol (3-Stufen: Kein/Chronisch/Akut). Outputs: MAC alterskorrigiert, MAC effektiv, Fet Isofluran (Vol%), Verbrauch (ml/h, grob). Besonderheiten: Clinical Mode (Flags, Range-Badges, Summary), Formeln & Quellen (Explain), Alkohol-Selector mit Tooltip.
- **Mannitol / Osmofundin 15 %** – Zweck: Mannitol-Dosis und Osmofundin-Volumen aus Körpergewicht. Inputs: Gewicht (kg), Dosis (g/kg). Outputs: Mannitol (g), Osmofundin 15 % (ml). Besonderheiten: Default 0,5 g/kg.
- **Noradrenalin Perfusor** – Zweck: µg/kg/min ↔ ml/h bidirektional. Inputs: mg/Spritze, ml/Spritze, Laufrate (ml/h), optional Gewicht + Ziel µg/kg/min. Outputs: µg/kg/min bzw. abgeleitete ml/h. Besonderheiten: Migration von alten Noradrenalin-/Katecholamin-Blöcken.
- **Heparin Perfusor (IE/kg/h ↔ ml/h)** – Zweck: Ziel IE/kg/h in Laufrate ml/h umrechnen. Inputs: IE in Spritze, ml gesamt, Ziel IE/kg/h. Outputs: ml/h.
- **Sedierungs-Perfusor (Propofol, Midazolam)** – Zweck: mg/kg/h → ml/h, mg/h. Inputs: Medikament, mg/ml, Gewicht, Dosis mg/kg/h. Outputs: ml/h, mg/h.
- **MAP-Ziel** – Zweck: Mittlerer arterieller Druck (Näherung). Inputs: systolisch, diastolisch. Output: MAP = SYS + 2×DIA / 3.
- **IBW / PBW (ARDS)** – Zweck: Ideal-/Predicted Body Weight (ARDSNet), optional TV 4–8 ml/kg. Inputs: Geschlecht, Körpergröße (cm), optional TV. Outputs: IBW, PBW, TV-Bereich.
- **BE-Korrektur (TRIS/NaHCO₃)** – Zweck: TRIS- und NaHCO₃-Mengen aus BE und Gewicht. Inputs: Gewicht (kg), Base Excess. Outputs: TRIS (ml), NaHCO₃ (ml).
- **PaO₂/FiO₂ Ratio** – Zweck: Horovitz-Index, Berlin-ARDS-Klassifikation (bei PEEP ≥ 5). Inputs: PaO₂ (mmHg), FiO₂ (Fraktion oder %), optional PEEP. Outputs: P/F (mmHg), Berlin (mild/moderat/schwer/nicht beurteilbar).
- **mg/kg Standard (Dose/Volumen/Vials)** – Zweck: Dosis aus mg/kg, Volumen, Vial-Anzahl. Inputs: mg/kg, max Dosis, Vial (mg), Volumen (ml). Outputs: Dosis (mg), Volumen (ml), Vials.
- **GCS Helper** – Zweck: Glasgow Coma Scale Summe. Inputs: E, V, M. Output: Summe 3–15.

(Katecholamin Perfusor und alter „Noradrenalin PRO“ sind entfernt; bestehende Notizen werden auf Noradrenalin Perfusor gemappt.)

---

## Übersicht

Im contentEditable-Editor können mehrere Rechner-Typen als Smart-Blocks eingefügt werden. Jeder Block ist löschbar und duplizierbar; die Konfiguration wird im Notiz-HTML gespeichert.

## Rechner einfügen

1. Toolbar: **Einfügen** → **Rechner**
2. Auswahl aus der Registry (siehe Tabelle unten).
3. Klick auf einen Eintrag fügt den Block ein.

## Verfügbare Rechner

| Typ | Titel | Beschreibung |
|-----|--------|--------------|
| `dantrolene` | Dantrolen (Agilus) | 2,5 mg/kg (max. 300 mg), 120 mg/Vial, 22,6 ml/Vial |
| `isoflurane-sedation` | Isofluran ICU Rechner (PRO V4) | MAC-Näherung, Ko-Sedierung, Verbrauch; Clinical Mode, Formeln & Quellen |
| `mannitol-osmofundin` | Mannitol / Osmofundin 15 % | Dosis (g/kg) → Mannitol (g), Osmofundin 15 % (ml) |
| `noradrenaline-perfusor` | Noradrenalin Perfusor | µg/kg/min ↔ ml/h bidirektional |
| `heparin` | Heparin Perfusor | IE/kg/h ↔ ml/h |
| `sedation-infusion` | Sedierungs-Perfusor | Propofol/Midazolam, mg/kg/h → ml/h |
| `map-target` | MAP-Ziel | SYS + 2×DIA / 3 |
| `pbw-ards` | IBW / PBW (ARDS) | ARDSNet, optional TV 4–8 ml/kg |
| `be-correction` | BE-Korrektur (TRIS/NaHCO₃) | TRIS-/NaHCO₃-Menge aus BE und kg |
| `pfratio` | PaO₂/FiO₂ Ratio | Horovitz-Index, Berlin-ARDS (PEEP ≥ 5) |
| `weight-dose` | mg/kg Standard | Dose/Volumen/Vials |
| `gcs` | GCS Helper | E, V, M → Summe 3–15 |

## Block-Aktionen

- **Entfernen (🗑):** Block wird aus der Notiz gelöscht, danach wird gespeichert.
- **Duplizieren (📋):** Block wird mit gleicher Konfiguration direkt darunter eingefügt.

## Datenmodell

Jeder Block im HTML:

- `data-smart-block="calculator"`
- `data-calculator-type="..."` (siehe Tabelle oben)
- `data-version="1"`
- `data-config="..."` (JSON, HTML-encoded)

Alte Blöcke ohne `data-calculator-type` werden als **dantrolene** gerendert.

## Recovery / Backup

- **Notiz-Backup exportieren:** Menü (⋯) → „Notiz-Backup exportieren“ → lädt den aktuellen Notiz-Inhalt als `.html` herunter.
- **Git:** Nach Änderungen committen/taggen für Wiederherstellung.

## Manueller Testplan

1. **Einfügen:** Einfügen → Rechner → Dantrolen (Agilus) → Block erscheint, Gewicht eingeben → Dosis/Volumen/Vials prüfen.
2. **Noradrenalin PRO:** Einfügen → Noradrenalin PRO → Gewicht + Ziel µg/kg/min → ml/h prüfen; Rate ml/h eingeben → µg/kg/min wird berechnet.
3. **Weitere Typen:** Sedierung, MAP, PBW, P/F, GCS einfügen und Werte prüfen.
4. **Duplizieren:** Bei einem Block „Duplizieren“ klicken → zweiter Block darunter mit gleicher Config.
5. **Entfernen:** „Entfernen“ klicken → Block verschwindet, Notiz speichert.
6. **Reload:** Notiz schließen/neu öffnen → Rechner-Blöcke bleiben erhalten und funktionsfähig.
7. **Backup:** Menü → Notiz-Backup exportieren → .html enthält alle Blöcke (data-config).

## Smoke-Test (Pro Pack)

- **Noradrenalin:** 4 mg/50 ml, 70 kg, 0,1 µg/kg/min → ml/h ≈ 5,3; umgekehrt 5 ml/h → µg/kg/min ≈ 0,1.
- **MAP:** 120 / 80 → MAP = 93.
- **PBW:** m, 170 cm → PBW ≈ 66 kg; TV 4–8 ml/kg → 264–528 ml.
- **P/F:** PaO₂ 100, FiO₂ 0,5 → P/F = 200.
- **GCS:** E4 V5 M6 → 15.

# Pro ICU Calculator Smart Blocks

## Übersicht

Im contentEditable-Editor können mehrere Rechner-Typen als Smart-Blocks eingefügt werden. Jeder Block ist löschbar und duplizierbar; die Konfiguration wird im Notiz-HTML gespeichert.

## Rechner einfügen

1. Toolbar: **Einfügen** → **Rechner**
2. Auswahl: Dantrolen, Noradrenalin PRO, Katecholamin, Heparin, Sedierungs-Perfusor, MAP-Ziel, IBW/PBW, PaO₂/FiO₂, mg/kg Standard, GCS Helper
3. Klick auf einen Eintrag fügt den Block ein.

## Verfügbare Rechner

| Typ | Titel | Beschreibung |
|-----|--------|--------------|
| `dantrolene` | Dantrolen (Agilus) | 2,5 mg/kg (max. 300 mg), 120 mg/Vial, 22,6 ml/Vial |
| `noradrenaline` | Noradrenalin PRO | µg/kg/min ↔ ml/h bidirektional, Presets 4/8/16 mg/50 ml |
| `catecholamine` | Katecholamin Perfusor | µg/kg/min ↔ ml/h |
| `heparin` | Heparin Perfusor | IE/kg/h ↔ ml/h |
| `sedation-infusion` | Sedierungs-Perfusor | Propofol/Midazolam, mg/kg/h → ml/h, mg/h |
| `map-target` | MAP-Ziel | SYS + 2×DIA / 3 (Näherung) |
| `pbw-ards` | IBW / PBW (ARDS) | ARDSNet-Formel, optional TV 4–8 ml/kg |
| `pfratio` | PaO₂/FiO₂ Ratio | P/F = PaO₂ / FiO₂ |
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

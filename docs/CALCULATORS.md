# Pro ICU Calculator Smart Blocks

## Übersicht

Im contentEditable-Editor können mehrere Rechner-Typen als Smart-Blocks eingefügt werden. Jeder Block ist löschbar und duplizierbar; die Konfiguration wird im Notiz-HTML gespeichert.

## Rechner einfügen

1. Toolbar: **Einfügen** → **Rechner**
2. Auswahl: **Dantrolen (Agilus)**, **Katecholamin Perfusor**, **Heparin Perfusor**, **mg/kg Standard**
3. Klick auf einen Eintrag fügt den Block ein.

## Verfügbare Rechner

| Typ | Titel | Beschreibung |
|-----|--------|--------------|
| `dantrolene` | Dantrolen (Agilus) | 2,5 mg/kg (max. 300 mg), 120 mg/Vial, 22,6 ml/Vial |
| `catecholamine` | Katecholamin Perfusor | µg/kg/min ↔ ml/h (Konzentration konfigurierbar) |
| `heparin` | Heparin Perfusor | IE/kg/h ↔ ml/h |
| `weight-dose` | mg/kg Standard | Dose/Volumen/Vials (konfigurierbar) |

## Block-Aktionen

- **Entfernen (🗑):** Block wird aus der Notiz gelöscht, danach wird gespeichert.
- **Duplizieren (📋):** Block wird mit gleicher Konfiguration direkt darunter eingefügt.

## Datenmodell

Jeder Block im HTML:

- `data-smart-block="calculator"`
- `data-calculator-type="dantrolene" | "catecholamine" | "heparin" | "weight-dose"`
- `data-version="1"`
- `data-config="..."` (JSON, HTML-encoded)

Alte Blöcke ohne `data-calculator-type` werden als **dantrolene** gerendert.

## Recovery / Backup

- **Notiz-Backup exportieren:** Menü (⋯) → „Notiz-Backup exportieren“ → lädt den aktuellen Notiz-Inhalt als `.html` herunter.
- **Git:** Nach Änderungen committen/taggen für Wiederherstellung.

## Manueller Testplan

1. **Einfügen:** Einfügen → Rechner → Dantrolen (Agilus) → Block erscheint, Gewicht eingeben → Dosis/Volumen/Vials prüfen.
2. **Weitere Typen:** Katecholamin, Heparin, mg/kg Standard einfügen und Werte prüfen.
3. **Duplizieren:** Bei einem Block „Duplizieren“ klicken → zweiter Block darunter mit gleicher Config.
4. **Entfernen:** „Entfernen“ klicken → Block verschwindet, Notiz speichert.
5. **Reload:** Notiz schließen/neu öffnen → Rechner-Blöcke bleiben erhalten und funktionsfähig.
6. **Backup:** Menü → Notiz-Backup exportieren → .html enthält alle Blöcke (data-config).

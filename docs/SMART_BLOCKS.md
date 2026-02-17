# Smart Blocks – Technische Referenz

## Struktur im DOM

Jeder Calculator-Smart-Block im contentEditable-Editor ist ein **div** mit folgenden Attributen:

| Attribut | Bedeutung |
|----------|-----------|
| `data-smart-block="calculator"` | Markierung als Smart-Block; wird von `mountSmartBlocks` gesucht. |
| `data-calculator-type="<typ>"` | Eindeutiger Typ aus der Registry (z. B. `dantrolene`, `isoflurane-sedation`, `noradrenaline-perfusor`). |
| `data-version="1"` | Optionale Version für spätere Migrationen (z. B. `"1"`). |
| `data-config="..."` | JSON-Konfiguration des Blocks, HTML-encoded (z. B. `&quot;` für Anführungszeichen). |
| `contenteditable="false"` | Wird beim Mount gesetzt, damit der Block nicht direkt editierbar ist. |

Beispiel (vereinfacht):

```html
<div data-smart-block="calculator" data-calculator-type="isoflurane-sedation" data-version="1" contenteditable="false" data-config="{&quot;version&quot;:1,...}"></div>
```

## data-calculator-type

- Muss einem Eintrag in **CALCULATORS** (Registry) entsprechen.
- Gültige Typen siehe `app/src/components/calculators/registry.ts`: `CalculatorType` und `CALCULATOR_TYPES`.
- Unbekannte oder fehlende Typen führen zum Fallback (z. B. `dantrolene`) oder werden beim Migrieren umgemappt (z. B. alte `noradrenaline`/`catecholamine` → `noradrenaline-perfusor`).

## data-config

- **Format:** JSON-Objekt, als String gespeichert (im HTML attribut-encoded).
- **Inhalt:** Typ-spezifisch. Enthält z. B. `label`, `input`, `version`, `alcoholMode`, `rassValue`, `macOverride` beim Isofluran-Rechner; bei anderen Rechnern z. B. `mgTotal`, `mlTotal`, `doseMgPerKg` usw.
- **Persistenz:** Bei jeder Änderung in der Rechner-UI wird `onUpdateConfig(next)` aufgerufen; die NotePage schreibt `el.setAttribute('data-config', JSON.stringify(next))` und ruft `syncEditorContent()` auf, sodass der Notiz-Inhalt (inkl. HTML) gespeichert wird.
- **Laden:** Beim Öffnen der Notiz wird der HTML-Inhalt geladen; `mountSmartBlocks(container)` parst für jeden Block `data-config` per `JSON.parse` und übergibt das Objekt als `config` an die Rechner-Komponente.

## Versionierung

- `data-version` kann für zukünftige Migrationen genutzt werden (z. B. bei Breaking Changes in der Config-Struktur).
- Aktuell: Version `"1"`; bei Duplizieren wird die Version des Ursprungsblocks übernommen.
- Migration alter Blöcke (z. B. Noradrenalin/Katecholamin → Noradrenalin Perfusor) erfolgt in der NotePage in `migrateCalculatorConfig(rawType, config, el)` vor dem Rendern.

## mountSmartBlocks – Ablauf

1. **Suche:** `container.querySelectorAll('[data-smart-block="calculator"]')`.
2. **Pro Block:**
   - `contenteditable="false"` setzen.
   - `data-calculator-type` und `data-config` auslesen; Config per `JSON.parse` parsen (bei Fehler: Block überspringen).
   - Optional: `migrateCalculatorConfig(rawType, config, el)` aufrufen (z. B. alte NA/Catecholamin-Typen umwandeln und `data-config`/`data-calculator-type` aktualisieren).
   - Aus der Registry die zu `type` passende `CalculatorDef` holen; `Component` mit `config`, `onRemove`, `onDuplicate`, `onUpdateConfig` rendern.
   - Erstes Mal: `createRoot(el)` und `root.render(component)`; danach Wiederverwendung derselben Root mit `root.render(component)`.
3. **Ergebnis:** Jeder Block zeigt die aktuelle Rechner-UI; Änderungen an der Config werden über `onUpdateConfig` in `data-config` zurückgeschrieben und mit `syncEditorContent()` in die Notiz persistiert.

## Persistenzverhalten

- **Speichern:** Der Notiz-Inhalt (HTML) wird bei `syncEditorContent()` an den App-State/Draft/Server übergeben; die Smart-Blocks sind Teil dieses HTMLs inkl. `data-config`.
- **Reload:** Beim erneuten Öffnen der Notiz wird das HTML geladen; `mountSmartBlocks` wird ausgeführt (z. B. nach setTimeout), parst wieder `data-config` und rendert die Rechner mit der gespeicherten Config – Recovery ist jederzeit möglich, solange das Notiz-HTML erhalten ist.
- **Backup:** Menü „Notiz-Backup exportieren“ lädt den aktuellen Notiz-Inhalt als `.html`; darin sind alle `data-smart-block`- und `data-config`-Attribute enthalten.

## Erweiterungen absichern

- Neuen Rechner: In der Registry `CalculatorType` und `CALCULATORS` sowie `CALCULATOR_TYPES` ergänzen; Komponente mit `CalculatorBlockProps` (config, onRemove, onDuplicate, onUpdateConfig) implementieren; Config-Struktur in `data-config` dokumentieren.
- Migration: In `migrateCalculatorConfig` alte Typen/Configs erkennen und in neue Typen/Configs überführen; `el.setAttribute('data-config', ...)` und ggf. `el.setAttribute('data-calculator-type', ...)` setzen, damit beim nächsten Speichern die neue Struktur persistiert wird.

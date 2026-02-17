# Isofluran ICU Calculator – PRO V4

## Modellübersicht

- **Strukturierte MAC-Näherung:** alterskorrigierte MAC (Referenz Isofluran 40 Jahre), multiplikative Faktoren für Ko-Sedierung und Temperatur.
- **Multiplikative Ko-Sedierungsfaktoren:** Opioid (µg/kg/min), Midazolam (mg/kg/h), Propofol (mg/kg/h), Dexmedetomidin (µg/kg/h) und Alkohol (3-Stufen) reduzieren die effektive MAC nach Stufenschema.
- **Heuristische Verbrauchsschätzung:** Verbrauch (ml/h) = (FetIso/100) × Minutenvolumen × 60 × 3; die Konstante „3“ ist eine Annahme, keine PK/PD-Simulation.

## Implementierte Einflussfaktoren

| Faktor | Quelle / Logik |
|--------|-----------------|
| **Alter** | Nickalls & Mapleson, Br J Anaesth 2003; MAC(age) = 1,15 × (1 − 0,06 × ((Alter−40)/10)). |
| **Temperatur** | Eger EI II, Miller’s Anesthesia; ~5 % MAC pro °C Abweichung von 37 °C; tempFactor = 1 − 0,05 × (37 − T). |
| **Opioid** | Katoh et al. 1999; Manyam et al. 2006; modellhafte Stufung (µg/kg/min → Faktor 0,85 / 0,65 / 0,5). |
| **Midazolam** | Miller’s Anesthesia; Barash; modellhafte Stufung (mg/kg/h → Faktor 0,9 / 0,75 / 0,7). |
| **Propofol** | Miller’s Anesthesia; Barash; modellhafte Stufung (mg/kg/h → Faktor 0,85 / 0,7 / 0,5). |
| **Dexmedetomidin** | Miller’s Anesthesia; Barash; modellhafte Stufung (µg/kg/h → Faktor 0,8 / 0,65 / 0,5). |
| **Alkohol** | 3-Stufen-Selektor: Kein (1,0), Chronisch alkoholkrank (1,2), Akute Intoxikation (0,8). |

Sedationsziel: RASS → MAC-Mapping oder optionaler MAC-Override.

## Clinical Mode

- **Zweck:** Schnelle klinische Plausibilisierung ohne Textwüste.
- **Summary-Zeile:** Eine Zeile mit Ziel-Fet (Vol%), Verbrauch (ml/h), MV (L/min).
- **Range-Badges:** MV, Temp, Fet als ok / warn / danger (z. B. hohes MV, Hypothermie, sehr niedrige/hohe Fet).
- **Flags (bis zu 3 sichtbar):** z. B. „Hohes Minutenvolumen“, „Hypothermie senkt MAC“, „Chronischer Alkohol: Sedierungsbedarf kann erhöht sein“, „Akute Intoxikation: Sedierungsbedarf kann reduziert sein“, „TargetMAC Override aktiv“, „Ko-Sedierung reduziert MAC“.
- Toggle: Clinical Mode ein/aus (Standard an).

## Formeln & Quellen (Explain)

- Toggle „Formeln & Quellen“ (Standard aus): zeigt Formel-Trace (Age MAC, Temp factor, Sedation target, Opioid/Mida/Prop/Dex, Alkohol-Faktor, MAC effective, FetIso, Consumption), Quellenliste mit Autoren, Annahmen.
- Quellen im Code: Nickalls & Mapleson; Eger EI II (Miller’s Anesthesia); Katoh et al. / Manyam et al.; Miller’s Anesthesia; Barash.

## Wichtige Annahmen

- **Heuristische Verbrauchskonstante „3“:** Als Annahme markiert; keine exakte Verbrauchsmessung.
- **Stufungsmodelle (Opioid/Benzo/Prop/Dex):** Modellhaft, nicht pharmakodynamisch.
- **Keine PK/PD-Simulation:** Strukturierte Näherung, keine Abbildung von Konzentrationsverläufen.
- **Nur Entscheidungsunterstützung:** Keine Therapieempfehlung; ärztliche Beurteilung und lokale SOP haben Vorrang.

## Quellen (wie im Code)

- **Age-adjusted MAC:** Nickalls & Mapleson. Br J Anaesth. 2003.
- **Temperature effect:** Eger EI II. In: Miller’s Anesthesia. (~5 % MAC per °C).
- **Opioid MAC reduction:** Katoh et al. 1999; Manyam et al. 2006.
- **Adjunct sedatives:** Miller’s Anesthesia; Barash.

Hinweistext in der App: *„Dieses Modell ist eine strukturierte Näherung und keine pharmakodynamische Simulation.“*

export interface ClinicalInfo {
  receptorEffect: string
  halfLife: string
  morphineEquivalence: string
  indication: string
  contraindications: string
  cave: string
  dosageGuidance: {
    mild: string
    moderate: string
    deep: string
  }
}

export interface PerfusorMedication {
  id: string
  name: string
  doseUnit: string
  amountUnit: string
  volumeUnit: string
  commonDoseRange: string
  formulaLabel: string
  defaultDose: number
  defaultAmount: number
  defaultVolume: number
  /** true wenn doseUnit pro Minute statt pro Stunde (z. B. Remifentanil µg/kg/min) */
  isPerMin?: boolean
  clinicalInfo?: ClinicalInfo
}

export const PERFUSOR_MEDICATIONS: PerfusorMedication[] = [
  {
    id: 'sufentanil',
    name: 'Sufentanil',
    doseUnit: 'µg/kg/h',
    amountUnit: 'µg',
    volumeUnit: 'ml',
    commonDoseRange:
      '0,3–0,5 µg/kg/h zur Tubustoleranz, abhängig von lokaler SOP, ärztlicher Anordnung und klinischer Beurteilung.',
    formulaLabel:
      'ml/h = (Gewicht in kg × Dosierung pro kg pro Stunde) / (Wirkstoffmenge in der Spritze / Spritzenvolumen in ml)',
    defaultDose: 0.3,
    defaultAmount: 750,
    defaultVolume: 50,
    clinicalInfo: {
      receptorEffect:
        'Hochselektiver µ-Opioid-Rezeptor-Agonist (ca. 5–10× potenter als Fentanyl). Starke analgetische, sedierende und atemdepressive Wirkung. Minimale Histaminfreisetzung.',
      halfLife:
        'Kontextsensitive HWZ: kurz bei Kurzinfusion (~10–15 min), steigt bei Langzeitinfusion auf >2 h. Terminale HWZ 10–20 h (hohe Lipophilie, großes Verteilungsvolumen).',
      morphineEquivalence:
        '1 µg Sufentanil ≈ 10 µg Fentanyl ≈ 75–100 µg Morphin i.v. (ca. 100-fach potenter als Morphin).',
      indication:
        'Analgesie-Komponente in der totalen intravenösen Anästhesie (TIVA) und Analgosedierung auf Intensivstation; Tubustoleranz, postoperative Analgesie.',
      contraindications:
        'Bekannte Opioid-Überempfindlichkeit. Relative KI: schwere respiratorische Insuffizienz ohne Beatmung, erhöhter Hirndruck (Vorsicht, nicht absolut), MAO-Hemmer (Wechselwirkungsrisiko).',
      cave:
        'Atemdepression und Atemstillstand – Überwachung/Beatmungsbereitschaft obligat. Akkumulation bei Niereninsuffizienz (aktive Metabolite). Rigidität der Thoraxmuskulatur bei schneller Bolus-Gabe. Entzugssymptome nach Langzeitgabe.',
      dosageGuidance: {
        mild: '0,1–0,2 µg/kg/h – leichte Analgesie-Komponente, z. B. bei kooperativem Patienten mit CPAP.',
        moderate:
          '0,2–0,4 µg/kg/h – moderate Analgosedierung, Tubustoleranz bei ruhigem beatmetem Patienten.',
        deep: '0,4–0,8 µg/kg/h – tiefe Analgesie/TIVA-Komponente, intraoperativ oder bei agitiertem Patienten (immer in Kombination mit Sedativum).',
      },
    },
  },
  {
    id: 'fentanyl',
    name: 'Fentanyl',
    doseUnit: 'µg/kg/h',
    amountUnit: 'µg',
    volumeUnit: 'ml',
    commonDoseRange:
      '1–3 µg/kg/h zur Analgosedierung auf Intensivstation; intraoperativ 2–5 µg/kg/h (TIVA-Komponente). Abhängig von SOP und Anordnung.',
    formulaLabel:
      'ml/h = (Gewicht in kg × Dosierung pro kg pro Stunde) / (Wirkstoffmenge in der Spritze / Spritzenvolumen in ml)',
    defaultDose: 1,
    defaultAmount: 2500,
    defaultVolume: 50,
    clinicalInfo: {
      receptorEffect:
        'Selektiver µ-Opioid-Rezeptor-Agonist. Ca. 100-fach potenter als Morphin. Ausgeprägte Analgesie und Atemdepression, geringe Histaminfreisetzung, keine relevante Herzfrequenz- oder Blutdrucksenkung bei Normaldosierung.',
      halfLife:
        'Kontextsensitive HWZ: steigt mit Infusionsdauer stark an (>8 h Infusion → HWZ >6 h). Terminale HWZ 3–7 h. Hohe Lipophilie → großes Verteilungsvolumen → Akkumulationsrisiko.',
      morphineEquivalence:
        '1 µg Fentanyl ≈ 0,1 µg Sufentanil ≈ 10 µg Morphin i.v. (ca. 100-fach potenter als Morphin).',
      indication:
        'Analgesie-Komponente bei Analgosedierung (ICU), TIVA, Einleitung und Aufrechterhaltung der Narkose, postoperative Analgesie.',
      contraindications:
        'Opioid-Überempfindlichkeit. Relative KI: schwere obstruktive Lungenerkrankung ohne Beatmung, MAO-Hemmer (Serotonin-Syndrom-Risiko), schwere Leberfunktionsstörung.',
      cave:
        'Akkumulation bei Langzeitinfusion – kontextsensitive HWZ beachten. Atemdepression. Thoraxrigidität bei schneller Bolusgabe. Entzug nach Langzeitanwendung. Bei Niereninsuffizienz Metabolit-Akkumulation möglich.',
      dosageGuidance: {
        mild: '0,5–1 µg/kg/h – leichte Analgesie-Komponente, angepasste Beatmung, kooperativer Patient.',
        moderate:
          '1–2 µg/kg/h – Analgosedierung, Tubustoleranz bei moderatem Schmerzniveau.',
        deep: '2–5 µg/kg/h – tiefe Analgosedierung/TIVA-Komponente intraoperativ; Atemdepression einkalkuliert, Beatmung obligat.',
      },
    },
  },
  {
    id: 'remifentanil',
    name: 'Remifentanil',
    doseUnit: 'µg/kg/min',
    amountUnit: 'µg',
    volumeUnit: 'ml',
    commonDoseRange:
      '0,05–0,2 µg/kg/min zur Analgosedierung (ICU/TIVA); intraoperativ 0,1–0,5 µg/kg/min. Abhängig von SOP und Anordnung.',
    formulaLabel:
      'ml/h = (Gewicht in kg × Dosierung in µg/kg/min × 60 min) / (Wirkstoffmenge in der Spritze / Spritzenvolumen in ml)',
    defaultDose: 0.1,
    defaultAmount: 5000,
    defaultVolume: 50,
    isPerMin: true,
    clinicalInfo: {
      receptorEffect:
        'Selektiver µ-Opioid-Rezeptor-Agonist mit Ester-Struktur. Hydrolysiert durch unspezifische Plasma- und Gewebeesterasen – daher einzigartig kurze, kontext-unabhängige Wirkdauer unabhängig von Infusionsdauer.',
      halfLife:
        'HWZ 3–5 Minuten (kontextunabhängig!). Keine Akkumulation, kein Aufwachkater. Anflutung und Abflutung extrem schnell – Wirkung endet ca. 5–10 min nach Stopp.',
      morphineEquivalence:
        '1 µg/kg/min Remifentanil ≈ ca. 60 µg/kg/h Fentanyl ≈ ca. 6 µg/kg/h Sufentanil. Direkte Äquivalenz schwierig wegen kontextunabhängiger Kinetik.',
      indication:
        'TIVA-Analgesie-Komponente (v. a. bei kurzen Eingriffen oder wenn schnelle Steuerbarkeit erforderlich ist), Analgosedierung ICU (kurz bis mittelfristig), Intubation/Extubation unter kontrollierter Analgesie.',
      contraindications:
        'Opioid-Überempfindlichkeit. Nicht als einziges Analgetikum nach Ende der Infusion – zwingend Bridging-Analgesie planen. KI: epidurale oder intrathekale Gabe (Glycin-Träger neurotoxisch).',
      cave:
        'Abrupter Analgesieverlust nach Stopp – Bridging-Analgesie (z. B. Piritramid, NSAR) MUSS vor Infusionsstopp eingeleitet sein. Bradykardie und Hypotension möglich. Keine intrathekale/epidurale Anwendung (Glycin-Vehikel). Opioid-induzierte Hyperalgesie bei Hochdosistherapie.',
      dosageGuidance: {
        mild: '0,025–0,05 µg/kg/min – leichte Analgesie-Komponente, wacher kooperativer Patient (Remifentanil-Sedierung nach Kollef).',
        moderate:
          '0,05–0,15 µg/kg/min – Analgosedierung, Tubustoleranz, oberflächliche TIVA-Komponente.',
        deep: '0,15–0,5 µg/kg/min – tiefe Analgesie intraoperativ (TIVA); Beatmung obligat, Bridging-Analgesie vor Stopp planen.',
      },
    },
  },
]

export function getPerfusorMedicationById(id: string): PerfusorMedication {
  return PERFUSOR_MEDICATIONS.find((m) => m.id === id) ?? PERFUSOR_MEDICATIONS[0]
}

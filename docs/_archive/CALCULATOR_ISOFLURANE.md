# Isofluran ICU Sedierungs-Rechner (PRO V4)

## Inputs

- Gewicht (kg), Alter (Jahre), Temperatur (°C), Minutenvolumen (L/min), Alkohol-Faktor
- Sedationsziel: RASS (-5 bis 0) oder optional MAC-Override
- Opioid (ml/h, µg/ml), Midazolam (ml/h, mg/ml), Propofol (ml/h, mg/ml), Dex (ml/h, µg/ml)

## Formeln (Kern)

- MAC(age) = 1,15 × (1 − 0,06 × ((Alter − 40)/10))
- Temp-Faktor = 1 − 0,05 × (37 − Temp)
- Co-Med-Faktoren aus Dosen (Opioid µg/kg/min, Mida/Prop mg/kg/h, Dex µg/kg/h)
- MAC_eff = MAC(age) × OpioidF × MidaF × PropF × DexF × AlkoholF × TempF
- FetIso (Vol%) = MAC_eff × MAC_Ziel
- Verbrauch (ml/h, grob) = (FetIso/100) × MV × 60 × 3

## Testfälle

**Default:** kg 80, age 60, temp 37, MV 8, RASS -3, alle Med 0, alcohol 1  
→ Erwartung: macAgeAdjusted ≈ 1,15, macEffective ≈ 1,15, fetIso ≈ 0,575, Verbrauch plausibel.

**Opioid 0,2 µg/kg/min:** z. B. 80 kg, 1 ml/h, 960 µg/ml → opioidUgKgMin = 0,2 → Faktor 0,5 (Schwelle ≥ 0,15).

## Guards

- weightKg: 20–250 (Warnung)
- age: 16–100 (Warnung)
- temperatureC: 32–41 (Warnung)
- minuteVolumeLMin: 2–30 (Warnung)
- alcoholFactor: 0,5–1,5 (Warnung)
- Division durch 0 vermieden (kg/MV > 0).


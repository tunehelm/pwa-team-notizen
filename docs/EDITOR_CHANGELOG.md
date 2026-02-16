# Editor Update – Markdown Table Paste Support
<— HIER den kompletten Text einfügen, den ich dir vorher gegeben habe

## Draft Restore Timing Fix

- Initialisierung des Editor-Inhalts aus setEditorNode entfernt
- setEditorNode setzt jetzt nur noch den Ref und editorMounted
- Neuer zentraler useEffect wartet auf:
  - note?.id
  - editorMounted
  - editorRef.current
- Draft oder Server-Content wird genau einmal pro Note angewendet
- verhindert leeren Editor nach Reload
- keine Regression beim Notiz-Wechsel

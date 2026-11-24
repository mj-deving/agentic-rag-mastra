---
task: "Agentic RAG über den EU AI Act auf Mastra, lokal mit Ollama, mit Eval-Gate"
slug: 20261109_agentic-rag-mastra
project: agentic-rag-mastra
effort: advanced
effort_source: inferred
phase: build
progress: 17/19
mode: interactive
started: 2026-11-09T12:00:00+01:00
updated: 2026-11-09T12:00:00+01:00
absence_review: skipped — Anti-Kriterien ISC-13/14 aus den Publikationsgrenzen abgeleitet, Fremdreview vor Veröffentlichung
---

> **Über diese Datei.** Das ist die ISA (Ideal State Artifact), gegen die dieses Repo gebaut wurde:
> was „fertig“ hieß, mit welcher Probe jedes Kriterium widerlegt würde und was bewusst als Grenze
> stehen blieb. Es ist der Arbeitsstand aus dem Bau, nur um private Bezüge bereinigt; Hinweise wie
> „kein Remote“ oder „ISA.md gitignored“ beschreiben die Zeit vor der Veröffentlichung. Commit-Hashes
> stammen aus der lokalen Vorgeschichte, öffentlich wurde das Repo als neuer Verlauf exportiert. Die
> Leak-Probes lesen ihre Begriffe aus einer lokalen, nicht versionierten Datei `.private-terms`.

## Ideal State

### L3 · One sentence

Ein öffentliches Mastra-Repo misst, welche Audit-Garantien für zitierendes, verweigerndes RAG ein Agent-Framework mitbringt und welche man selbst bauen und prüfen muss.

### L2 · Summary

Wer RAG in einem regulierten Umfeld baut, klont das Repo, startet es in fünf Minuten lokal ohne API-Key und sieht einen Mastra-Agenten, der Fragen zum EU AI Act mit Paragrafen-Zitaten beantwortet oder sauber verweigert.

- Aufbau folgt den offiziellen `mastra-ai/template-*` (Agent, Tools, Workflow, Vector Store unter `src/mastra/`).
- Ein Golden Set mit ≥ 30 Fällen und ein deterministisches Eval-Gate messen Zitatgenauigkeit, Verweigerung und Zitat-Validität.
- Alles läuft lokal: Ollama (qwen3:8b, bge-m3), LibSQL, Mastra Studio mit Traces.
- Das README stellt ehrlich gegenüber: was Mastra geschenkt hat und welche Gates von Hand dazukamen, verglichen mit audit-grade-rag.

### L1 · Full articulation

audit-grade-rag zeigt handgebautes, auditierbares RAG. Was dort fehlt, ist derselbe Anspruch auf einem verbreiteten Agent-Framework (Mastra, vergleichbar mit LangGraph oder PydanticAI). Dieses Repo ist der kleinste glaubwürdige Beleg dafür.

Der Korpus sind wörtliche deutsche Auszüge aus mehreren Artikeln der Verordnung (EU) 2024/1689, mit Provenienz und Hash, absatzweise gechunkt. Ein Mastra-Agent mit einem Such-Tool beantwortet Fragen nur aus abgerufenen Chunks, zitiert jede Aussage mit `[chunk:<id>]` und verweigert, wenn der Korpus die Frage nicht trägt. Ein Ingest-Workflow baut den Index mit bge-m3 über Ollama. Ein Eval-Runner schickt das Golden Set durch den echten Agenten und bewertet mit Mastra-Scorern: deterministische Code-Scorer als Gate, ein LLM-Scorer nur als Hinweis.

Der Moment des Erfolgs: `bun run eval` gibt eine Tabelle mit echten Zahlen aus, inklusive der Fälle, die scheitern, und das README sagt in einem Absatz, was das Framework abnimmt und was nicht.

## Problem

Handgebautes RAG mit Audit-Garantien ist in audit-grade-rag belegt, inklusive Langfuse-Tracing und Langfuse-Experimenten. Unbelegt war der Einsatz eines verbreiteten Agent-Frameworks und die Frage, welche dieser Garantien ein Framework mitbringt.

## Vision

Wer vor der Framework-Wahl steht, findet im README in zwei Minuten drei Dinge: ein lauffähiges Mastra-System, ehrliche Messwerte inklusive Fehlschläge und ein Architektururteil darüber, wo Frameworks enden.

## Out of Scope

- Kein Hosting, keine öffentliche Demo-URL.
- Keine Cloud-LLMs, keine API-Keys im Default-Pfad.
- Keine Rechtsberatung. Antworten sind Textstellen-Belege, keine Auslegung.
- Kein Umbau von audit-grade-rag.

## Constraints

- Bun als Paketmanager und Runner. TypeScript strict.
- Korpus-Chunks sind wörtliche Teilstrings eines committeten Quell-Snapshots (Regel aus audit-grade-rag übernommen).
- Lokal: Ollama mit `qwen3:8b` (Chat) und `bge-m3` (Embeddings, 1024 Dimensionen).
- Veröffentlichung auf GitHub erst nach ausdrücklichem Go des Maintainers. Bis dahin nur lokale, private Commits.

## Criteria

- [x] ISC-1: Struktur folgt `mastra-ai/template-chat-with-pdf`: `src/mastra/{index.ts,agents/,tools/,workflows/,lib/}`.
- [x] ISC-2: Korpus umfasst ≥ 6 Artikel der VO (EU) 2024/1689, jeder Chunk ist wörtlicher Teilstring seines Snapshots, jeder Snapshot hat Provenienz mit SHA-256.
- [x] ISC-3: Golden Set hat ≥ 30 Fälle mit den Tags `answered`, `multi-hop`, `numerical`, `out-of-corpus`, `ambiguous`; ≥ 6 Fälle erwarten Verweigerung.
- [x] ISC-4: `bun run ingest` baut den LibSQL-Vektorindex mit bge-m3 über einen Mastra-Workflow; erneutes Ausführen ist idempotent.
- [ ] ISC-5: Der Agent antwortet mit `[chunk:<id>]`-Zitaten oder exakt mit dem Verweigerungs-Marker.
- [x] ISC-6: Ein Code-Scorer prüft, dass jede zitierte Chunk-ID im Korpus existiert UND im selben Lauf abgerufen wurde.
- [x] ISC-7: Code-Scorer für Zitatgenauigkeit (gegen `expected_chunks`) und Verweigerungskorrektheit existieren und haben Unit-Tests mit Grenz- und Fehlerfällen.
- [x] ISC-15: Ein Held-out-Set (`golden/heldout.jsonl`, 8 Fälle, davon 4 Verweigerungen) ist geschrieben, bevor Prompt v2 läuft; Prompt-Änderungen werden dort beurteilt. Probe: Fakten-im-Chunk-Prüfung grün, Datei vor dem v2-Lauf angelegt.
- [x] ISC-16: Prompt-Versionen liegen nebeneinander in `src/mastra/agents/instructions.ts`, jede Ergebnisdatei nennt Prompt und Golden Set. Probe: `results/*.json` Felder `prompt`, `golden`.
- [x] ISC-17: Die Mastra-Scorer sind offline gegen einen aufgezeichneten echten Agentenlauf getestet, inklusive manipulierter Zitate (nicht abgerufen → 0, entfernt → 0). Probe: `bun test test/scorers.test.ts` grün.
- [x] ISC-18: Anti: Repo-Dateien enthalten keine privaten Bezüge (Liste in `.private-terms`, lokal und nicht versioniert). Probe: `git ls-files -z | xargs -0 rg -il -f .private-terms` ohne Treffer außerhalb dieser Zeile.
- [x] ISC-19: `mastra dev` und die Skripte öffnen dieselbe Datenbank, unabhängig vom Arbeitsverzeichnis. Probe: Studio-API beantwortet Art.-5-Bußgeldfrage mit `[chunk:art99-p3]`; nur `./mastra.db` existiert.
- [x] ISC-8: `bun run eval` läuft das Golden Set durch den echten Agenten, schreibt `results/` als JSON und Markdown und endet ≠ 0 unter den Schwellen.
- [x] ISC-9: Ein Eval-Lauf mit echten Zahlen ist committet, Fehlschläge inklusive.
- [ ] ISC-10: Mastra Studio (`bun run dev`) zeigt Agent und Workflow; ein Trace eines Agentenlaufs ist sichtbar.
- [x] ISC-11: `bun run check` (typecheck plus Unit-Tests) ist grün und läuft ohne Ollama.
- [x] ISC-12: Das README enthält Fünf-Minuten-Start, Architektur, Messwerte und den Abschnitt „Was Mastra abnimmt, was nicht“.
- [x] ISC-13: Anti: keine API-Keys, Tokens oder privaten Pfade im Repo (Probe: gitleaks oder grep).
- [x] ISC-14: Anti: README behauptet keine Zahl, die nicht in `results/` steht.
- [x] ISC-20: Ein Mastra-Output-Processor prüft vor der Rückgabe jedes `[chunk:<id>]` gegen die im selben Lauf abgerufenen Chunks und ersetzt eine Antwort mit nicht abgerufenem oder fehlendem Zitat durch den Verweigerungs-Marker. Probe: Unit-Test auf dem aufgezeichneten Lauf (echt → durch, manipuliert → ersetzt, unzitiert → ersetzt, Verweigerung → durch).
- [x] ISC-21: Der Guard wirkt im echten Antwortpfad (`agent.generate` für `bun run ask` und Eval, `agent.stream` für Studio), nicht nur im Scorer; im Stream erreicht kein Delta einer blockierten Antwort den Client. Probe: Offline-Tests über `Agent.generate` und `Agent.stream` mit Mock-Modell und Such-Tool-Stub; Gegenprobe ohne Guard-Hook wird rot.
- [x] ISC-22: `GUARD=on|off` schaltet den Guard, beide Modi laufen; ungültige Werte brechen ab statt still einen Modus zu wählen. Probe: Unit-Test der Config-Parsefunktion.
- [x] ISC-23: Ein Eval-Lauf mit Guard (Prompt v2, golden v1 und heldout) liegt in `results/`, jede Ersetzung ist mit Originalantwort protokolliert, und das README nennt Auslösungen, echte Treffer, fälschlich blockierte gute Antworten und den Preis in korrekten Antworten, inklusive strenger Recall-/Faktenwerte (Fehlverweigerung = 0).
- [x] ISC-24: Anti: Der Guard ersetzt keine Antwort, deren Zitate alle im Lauf abgerufen wurden. Probe: Unit-Test echter Lauf bleibt unverändert; im Eval-Lauf hat jede Auslösung `citation-validity` = 0 auf dem Original.

## Test Strategy

| isc | type | check | threshold | tool | anchors_to |
|-----|------|-------|-----------|------|------------|
| ISC-2 | bash | Chunk ⊂ Snapshot, Hash stimmt | 100 % | bun test test/corpus.test.ts | |
| ISC-3 | bash | Golden-Set-Schema und Tag-Abdeckung | ≥ 30, ≥ 6 Verweigerung | bun test test/golden.test.ts | |
| ISC-6 | bash | Scorer-Grenzfälle Zitat-Validität | alle grün | bun test test/scorers.test.ts | |
| ISC-7 | bash | Scorer-Grenzfälle Genauigkeit und Verweigerung | alle grün | bun test test/scorers.test.ts | |
| ISC-8 | bash | Eval-Exit-Code | ≠ 0 unter Schwelle | `bun run eval` | |
| ISC-11 | bash | Check ohne Ollama | exit 0 | `bun run check` | |
| ISC-13 | bash | Secret-Scan | 0 Treffer | `rg -i "api[_-]?key\|sk-\|/Users/"` | |
| ISC-1 | bash | Mastra-Layout vorhanden | alle Pfade existieren | `ls src/mastra/{index.ts,agents,tools,workflows,lib}` | |
| ISC-4 | bash | Ingest idempotent | 66 Zeilen nach zwei Läufen | `bun run ingest` ×2, Zeilen zählen | |
| ISC-9 | bash | Ergebnisse committet | 4 Läufe in HEAD | `git ls-files results/ \| wc -l` = 8 | |
| ISC-12 | bash | README-Abschnitte | 4 Überschriften | `rg "^## (Quickstart\|Architecture\|Results\|What Mastra)" README.md` | |
| ISC-14 | manual | README-Zahlen gegen `results/*.json` | jede Zahl gefunden | Abgleich per bun-Skript, kein stehender Test, weil README Prosa ist | |
| ISC-15 | manual | Held-out vor v2 geschrieben | Reihenfolge | Zeitfolge nur aus Sessionverlauf belegbar; Fakten-im-Chunk über `bun test test/golden.test.ts` | |
| ISC-16 | bash | Prompt und Golden in Ergebnissen | Felder vorhanden | `rg -l '"prompt"' results/*.json` | |
| ISC-17 | bash | Scorer gegen echten Lauf | alle grün | bun test test/scorers.test.ts | |
| ISC-18 | bash | Keine privaten Bezüge | nur Probe-Zeile | `git ls-files -z \| xargs -0 rg -il -f .private-terms` | |
| ISC-19 | manual | Gleiche DB für dev und Skripte | Studio-Antwort mit `[chunk:art99-p3]` | braucht laufendes Ollama und Studio, daher kein CI-Test | |
| ISC-20 | bash | Guard auf aufgezeichnetem Lauf | 4 Fälle grün | bun test test/citation-guard.test.ts | |
| ISC-21 | bash | Guard im generate- und stream-Pfad | Marker in `text`, kein Original-Delta | bun test test/citation-guard.test.ts | |
| ISC-22 | bash | GUARD-Flag-Parsing | on/off/leer/ungültig | bun test test/citation-guard.test.ts | |
| ISC-23 | bash | Guard-Lauf in results | 2 Läufe mit `guard: "on"` und `guardBlocks` | `rg -l '"guard": "on"' results/*.json` | |
| ISC-24 | bash | Keine Ersetzung gültiger Antworten | 0 Ersetzungen mit Validität 1 | bun test + bun-Skript über `guardBlocks` | |

## Features

```yaml
- name: Corpus
  description: Fetch-Skript, Snapshots, Provenienz, absatzweise Chunks
  satisfies: [ISC-2]
- name: GoldenSet
  description: ≥ 30 handgeschriebene Fälle gegen den echten Text
  satisfies: [ISC-3]
- name: IngestWorkflow
  description: Mastra-Workflow, bge-m3 via Ollama, LibSQLVector
  satisfies: [ISC-4]
- name: Agent
  description: Mastra-Agent mit Such-Tool, Zitier- und Verweigerungsvertrag
  satisfies: [ISC-1, ISC-5, ISC-10]
- name: Scorers
  description: Code-Scorer als Gate, LLM-Scorer als Hinweis
  satisfies: [ISC-6, ISC-7]
- name: EvalRunner
  description: Golden Set durch den Agenten, Ergebnisdateien, Schwellen
  satisfies: [ISC-8, ISC-9]
- name: Docs
  description: README, Vergleich mit audit-grade-rag
  satisfies: [ISC-12, ISC-14]
```

## Decisions

- 2026-11-09: Neues Repo statt Adapter in audit-grade-rag, Vergleich über gleichen Korpus-Ursprung.
- 2026-11-09: Lokal über Ollama statt API-Key.
- 2026-11-09: Golden Set von audit-grade-rag (5 Fälle, 8 Chunks) ist zu klein für eine Aussage; Korpus und Golden Set werden erweitert.

- 2026-11-09: Grader-Fakten auf Wortstämme umgestellt („sechs Monat“, „dokumentier“, „beschränk|begrenz“), weil Flexion als Modellfehler zählte. Grader-Fix, keine Modelländerung.
- 2026-11-09: Kein Cosine-Schwellwert als Verweigerungs-Gate: Verteilungen überlappen (gemessen).
- 2026-11-09: Prompt v2 nach Lesen der v1-Fehler. Wirkung zählt nur auf golden/heldout.jsonl (8 Fälle, vor dem v2-Lauf geschrieben).
- 2026-11-09: Guard ersetzt statt zu reparieren (Fallback = `[KEINE_GRUNDLAGE]` plus ein Satz): welcher Satz ein falsches Zitat tragen sollte, ist nicht entscheidbar, die Verweigerung ist die einzige vertragskonforme Antwort. Default `GUARD=on`, ungültige Werte werfen.
- 2026-11-09: Stream-Pfad über Mastras Hold/Flush-Schlüssel `__mastraFlushHeldParts` (in 1.82 nicht re-exportiert, nur als Konstante dokumentiert); Stream-Test bricht bei Umbenennung. Preis: Antworten streamen nicht mehr tokenweise.

## Evidence

2026-11-09 (Lauf 1, verworfen als Messung): qwen3:8b, Prompt v1, 40 Fälle. Gate citation-validity 1,0 (in gateResults, im Report fälschlich als „–“), Verweigerung 92,5 %, Recall 93,9 %, Fakten 84,8 %. Fehler gelesen: 3/7 Out-of-Corpus beantwortet mit gültig abgerufenen, aber nicht tragenden Zitaten; 3 Fakt-Fehlschläge waren Flexionsfehler im Grader.
- Gate-Falsifier: echte Antwort 1, Zitat auf existierenden, nicht abgerufenen Chunk 0, Zitat entfernt 0. Als Offline-Test test/scorers.test.ts auf einem aufgezeichneten echten Lauf.
- ISC-11: `bun test` 41/41 grün ohne Ollama (Fixture), `tsc --noEmit` sauber.
- Top-1-Cosine trennt nicht: beantwortbar ab 0,561, Out-of-Corpus bis 0,592. Kein Score-Gate gebaut.

2026-11-09:
- ISC-1: `src/mastra/{index.ts,agents/,tools/,workflows/,lib/,scorers/}`, Struktur wie mastra-ai/template-chat-with-pdf (per gh api gelesen).
- ISC-2: 7 Artikel (4, 5, 6, 26, 50, 99, 113), 66 Chunks; `bun test test/corpus.test.ts` grün (Hash = Provenienz, Chunk ⊂ Snapshot, Rebuild = committet).
- ISC-3: 40 Fälle, 7 Verweigerungen, alle 5 Tags; `bun test test/golden.test.ts` grün inkl. „jeder erwartete Fakt steht im erwarteten Chunk“.
- ISC-4: `bun run ingest` zweimal, LibSQL-Tabelle danach 66 Zeilen (idempotent über Chunk-ID als Vektor-ID).
- ISC-6/7: `bun test test/grading.test.ts` grün, inkl. nicht abgerufener aber existierender Chunk -> 0, erfundene ID -> 0, unzitierte Antwort -> 0.
- Retrieval ohne LLM: recall@3 90,9 %, @5 93,9 %, @8 98,5 % über 33 beantwortbare Fälle.
- ISC-8: vier Läufe in `results/` (Prompt v1/v2 × golden/heldout); Verdikt failed bzw. scored, `scripts/eval.ts` endet nur bei `passed` mit 0, beobachtet exit 1 in allen vier.
- ISC-12: README hat Quickstart, Architecture, Results, „What Mastra gives you, and what it doesn't“.
- ISC-13: `git ls-files -z | xargs -0 rg -il -f .private-terms` plus Secret-Muster außerhalb node_modules: nur Prosa-Erwähnungen („ohne API-Key“) und die Probe-Zeilen dieser ISA, kein Schlüsselwert, kein lokaler Pfad.
- ISC-14: jede README-Zahl aus `results/*.json` nachgerechnet; strikte Recall-/Faktenwerte (Verweigerung = 0) per bun-Skript aus denselben Dateien: v2 86,4 % / 81,8 %.
- Autoreview (`--engine claude`, P1): keine Befunde. Hinweis Nenner-Artefakt bei Recall/Fakten ins README übernommen.
- ISC-9: Commit 1d28450 enthält `results/` mit allen vier Läufen, Fehlschläge inklusive. Kein Remote.
- ISC-5 offen: Gate 95 % in beiden golden-Läufen, also nicht jede Antwort hält den Kontrakt.
- ISC-10 offen: Agent und Workflow in Studio sichtbar, Trace per API vollständig (14 Spans); Trace-Liste in Studio scheitert an Upstream-Bug in `@mastra/core` 1.82.0.

2026-11-09 (Citation Guard, Commit 69f2782):
- ISC-20: `bun test test/citation-guard.test.ts` auf `agent-run-art26-logs.json`: echte Antwort unverändert, `art99-p3` statt `art26-p6` ersetzt, zusätzliches `art5-p1` ersetzt, unzitiert ersetzt, Verweigerung unverändert.
- ISC-21: `Agent.generate()` und `Agent.stream()` mit `MastraLanguageModelV2Mock` und Such-Tool-Stub: gültig kommt durch, manipuliert kommt als Fallback an; im Stream enthält kein Delta „sechs Monaten“. Gegenproben rot: ohne `outputProcessors` scheitert der generate-Test, ohne `processOutputStream` der Stream-Test. `bun run check` 51/51.
- ISC-22: Parse-Test on/off/leer/ungültig grün; Laufzeit: `GUARD=on` lädt den Agenten mit einem Output-Processor, `GUARD=off` mit keinem, `GUARD=bogus` bricht mit Fehler ab. Kein Ollama-Eval mit `GUARD=off` nach der Änderung; die ungeschützten Ergebnisse stammen von vor dem Flag (gleicher Codepfad ohne Processor).
- ISC-23: `results/2026-11-09-qwen3-8b-v2-guard-{v1,heldout}.{json,md}` mit `guard: "on"` und `guardBlocks`. 2/40 golden, 0/8 held-out; beide echte Treffer (`a113-application` erfundenes Datum ohne Suchaufruf, `a5-emotion-workplace` verkürzte ID und umgekehrte Aussage), 0 gute Antworten blockiert, 0 korrekte Antworten verloren. Verweigerung 82,5 % vs. 87,5 % ungeschützt, Differenz genau diese 2 Fälle. Streng: Recall 83,3 %, Fakten 81,8 % (84,8 % mit durchgelassener umgekehrter Antwort); held-out 75,0 %/75,0 %. Ein erster Guard-Lauf (nur generate-Hook, überschrieben) feuerte einmal auf `a113`.
- ISC-24: Unit-Test echter Lauf unverändert; per Skript hat jede `guardBlocks`-Originalantwort `citationValidity` = 0, und jede ersetzte Antwort im Lauf ist der Fallback.
- Autoreview `--engine claude --max-priority P1`: Runde 1 ein P1 (Stream-Pfad ungeschützt, README-Claim zu Studio) → `processOutputStream` ergänzt; Runde 2 scoped-clean, README-Zahlen vom Reviewer nachgerechnet.
- ISC-5 weiter offen: mit Guard hält jede ausgelieferte Antwort Zitat-oder-Marker (Gate 100 % in beiden Guard-Läufen), aber Fallback und Prompt-Verweigerungen sind Marker plus Satz, nicht „exakt“ der Marker. Formulierung von ISC-5 ist Entscheidung des Owners.

# Eval run 2026-11-09T12:58:00.021Z

Model `qwen3:8b`, prompt `v1`, golden `golden/heldout.jsonl`, embeddings `bge-m3`, top-k 5, 8 cases. Verdict: **scored**.

## Aggregate

| metric | score | rule |
|---|---|---|
| retrieval recall@k (no LLM) | 100.0 % | tracked |
| citation-validity | 100.0 % | gate: must be 100 % |
| refusal-correctness | 37.5 % | ≥ 85.0 % |
| citation-recall | 100.0 % | ≥ 80.0 % |
| fact-coverage | 100.0 % | ≥ 70.0 % |

## By tag

| tag | n | validity | refusal | recall | facts |
|---|---|---|---|---|---|
| numerical | 2 | 100.0 % | 50.0 % | 100.0 % | 100.0 % |
| out-of-corpus | 4 | 100.0 % | 0.0 % | – | – |
| single | 2 | 100.0 % | 100.0 % | 100.0 % | 100.0 % |

## Cases below 1.0 (5)

### h-a99-midcap (answered)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> [KEINE_GRUNDLAGE] Die abgerufenen Auszüge enthalten dazu keine Grundlage.

### h-ooc-copyright (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Anbieter von KI-Modellen mit allgemeinem Verwendungszweck haben keine spezifischen Urheberrechtspflichten beim Training, sofern die KI-Systeme eine unterstützende Funktion für die Standardbearbeitung ausführen oder die vom Betreiber bereitgestellten Eingabedaten oder deren Semantik nicht wesentlich verändern [chunk:art50-p2]. Zudem gilt die Pflicht nicht, wenn die KI-Systeme zur Aufdeckung, Verhütung, Ermittlung oder Verfolgung von Straftaten gesetzlich zugelassen sind [chunk:art50-p2].

### h-ooc-conformity (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Das Konformitätsbewertungsverfahren für Hochrisiko-KI-Systeme ist in Artikel 6 der KI-Verordnung geregelt. Hochrisiko-KI-Systeme sind Systeme, die als Sicherheitsbauteil eines Produkts unter Harmonisierungsrechtsvorschriften der Union fallen oder selbst solch ein Produkt sind und einer Konformitätsbewertung durch Dritte gemäß diesen Vorschriften unterzogen werden müssen [chunk:art6-p1].  Zusätzlich gelten die in Anhang III genannten KI-Systeme als hochriskant [chunk:art6-p2].  Die Betreiber von Hochrisiko-KI-Systemen müssen geeignete technische und organisatorische Maßnahmen ergreifen, um die 

### h-ooc-ce-marking (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Die CE-Kennzeichnung muss bei einem Hochrisiko-KI-System an dem Produkt selbst oder an dem Sicherheitsbauteil angebracht werden, das Teil eines Produkts ist, das unter das Harmonisierungsrechtsvorschriften der Union fällt [chunk:art6-p1].

### h-ooc-market-surveillance (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Marktüberwachungsbehörden sind im Falle von schwerwiegenden Vorfällen mit Hochrisiko-KI-Systemen berechtigt, von den Betreibern eine unverzügliche Information zu verlangen. Sie werden in diesem Zusammenhang von den Betreibern über die Vorfälle informiert, sofern diese nicht durch den Anbieter oder Händler bereits gemeldet wurden. [chunk:art26-p5]


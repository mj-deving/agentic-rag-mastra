# Eval run 2026-11-09T15:02:11.213Z

Model `qwen3:8b`, prompt `v2`, guard `on`, golden `golden/heldout.jsonl`, embeddings `bge-m3`, top-k 5, 8 cases. Verdict: **scored**.

## Aggregate

| metric | score | rule |
|---|---|---|
| retrieval recall@k (no LLM) | 100.0 % | tracked |
| citation-validity | 100.0 % | gate: must be 100 % |
| refusal-correctness | 50.0 % | ≥ 85.0 % |
| citation-recall | 100.0 % | ≥ 80.0 % |
| fact-coverage | 100.0 % | ≥ 70.0 % |

## By tag

| tag | n | validity | refusal | recall | facts |
|---|---|---|---|---|---|
| numerical | 2 | 100.0 % | 50.0 % | 100.0 % | 100.0 % |
| out-of-corpus | 4 | 100.0 % | 25.0 % | – | – |
| single | 2 | 100.0 % | 100.0 % | 100.0 % | 100.0 % |

## Guard replacements (0)



## Cases below 1.0 (4)

### h-a99-midcap (answered)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> [KEINE_GRUNDLAGE] Die abgerufenen Auszüge enthalten dazu keine Grundlage.

### h-ooc-conformity (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Das Konformitätsbewertungsverfahren für Hochrisiko-KI-Systeme ist in Artikel 6 der KI-Verordnung geregelt. Hochrisiko-KI-Systeme sind Systeme, die als Sicherheitsbauteil von Produkten unter harmonisierendem Recht der Union verwendet werden oder selbst solche Produkte sind, und die einer Konformitätsbewertung durch Dritte gemäß den Harmonisierungsrechtsvorschriften der Union unterzogen werden müssen [chunk:art6-p1]. Zudem gelten die in Anhang III genannten KI-Systeme als hochriskant [chunk:art6-p2]. Die Betreiber von Hochrisiko-KI-Systemen müssen geeignete technische und organisatorische Maßnah

### h-ooc-ce-marking (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Die CE-Kennzeichnung bei einem Hochrisiko-KI-System muss an dem Produkt angebracht werden, das das KI-System ist oder dessen Sicherheitsbauteil es ist. Dies gilt, wenn das Produkt einer Konformitätsbewertung durch Dritte im Hinblick auf das Inverkehrbringen oder die Inbetriebnahme gemäß den in Anhang I aufgeführten Harmonisierungsrechtsvorschriften der Union unterzogen werden muss. [chunk:art6-p1]

### h-ooc-market-surveillance (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Marktüberwachungsbehörden sind im Falle von schwerwiegenden Vorfällen bei der Prüfung von KI-Systemen verpflichtet, unverzüglich informiert zu werden. Dies gilt insbesondere, wenn Betreiber einen schwerwiegenden Vorfall feststellen, der die Verwendung eines Hochrisiko-KI-Systems beeinträchtigen könnte. [chunk:art26-p5]


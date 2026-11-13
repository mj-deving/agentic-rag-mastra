# Eval run 2026-11-09T13:03:30.969Z

Model `qwen3:8b`, prompt `v2`, golden `golden/heldout.jsonl`, embeddings `bge-m3`, top-k 5, 8 cases. Verdict: **scored**.

## Aggregate

| metric | score | rule |
|---|---|---|
| retrieval recall@k (no LLM) | 100.0 % | tracked |
| citation-validity | 100.0 % | gate: must be 100 % |
| refusal-correctness | 62.5 % | ≥ 85.0 % |
| citation-recall | 100.0 % | ≥ 80.0 % |
| fact-coverage | 100.0 % | ≥ 70.0 % |

## By tag

| tag | n | validity | refusal | recall | facts |
|---|---|---|---|---|---|
| numerical | 2 | 100.0 % | 50.0 % | 100.0 % | 100.0 % |
| out-of-corpus | 4 | 100.0 % | 50.0 % | – | – |
| single | 2 | 100.0 % | 100.0 % | 100.0 % | 100.0 % |

## Cases below 1.0 (3)

### h-a99-midcap (answered)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> [KEINE_GRUNDLAGE] Die abgerufenen Auszüge enthalten dazu keine Grundlage.

### h-ooc-conformity (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Das Konformitätsbewertungsverfahren für Hochrisiko-KI-Systeme ist in Artikel 6 der KI-Verordnung geregelt. Hochrisiko-KI-Systeme sind Systeme, die als Sicherheitsbauteil eines Produkts unter Harmonisierungsrechtsvorschriften der Union fallen oder selbst ein solches Produkt sind, und die einer Konformitätsbewertung durch Dritte im Hinblick auf das Inverkehrbringen oder die Inbetriebnahme des Produkts unterzogen werden müssen [chunk:art6-p1]. Zusätzlich gelten die in Anhang III genannten KI-Systeme als hochriskant [chunk:art6-p2]. Die Betreiber von Hochrisiko-KI-Systemen müssen geeignete technis

### h-ooc-market-surveillance (refused)

{"citation-validity":1,"refusal-correctness":0,"citation-recall":null,"fact-coverage":null}

> Marktüberwachungsbehörden haben das Recht, bei der Prüfung von KI-Systemen informiert zu werden, wenn Betreiber Anhaltspunkte dafür haben, dass ein Hochrisiko-KI-System ein Risiko im Sinne von Artikel 79 Absatz 1 birgt. Sie müssen unverzüglich informiert werden, wenn Betreiber Grund zur Annahme haben, dass die Verwendung eines Hochrisiko-KI-Systems ein solches Risiko birgt. [chunk:art26-p5]


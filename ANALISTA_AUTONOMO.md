# Analista Junior Autônomo — Documento de Concepção

> Status: rascunho de viabilidade • Autor: Lucas Duarte • Data: 2026-06-17

## 1. Visão em uma frase

Um agente que **monitora continuamente filings, transcripts, redes sociais e preços**, gera **teses de investimento com nível de confiança calibrado**, e **alerta** o usuário quando a narrativa muda — sem dar ordens de compra/venda automáticas.

## 2. Por que "assistente" e não "robô-trader"

Antes de qualquer arquitetura, a decisão de produto mais importante:

| Posicionamento | Vantagens | Riscos |
|---|---|---|
| **Robô que decide e executa** | Vendável, "mágico" | CVM/SEC: recomendação de valores mobiliários sem registro é crime. Custo de erro é dinheiro real. Modelos de timing performam mal fora de amostra. |
| **Assistente de pesquisa (recomendado)** | Sem fricção regulatória se for ferramenta pessoal/educacional. Calibração de confiança é vendável por si só. Erros = perder uma tese, não perder capital. | Menos "uau". Precisa de UX boa para o usuário tomar a decisão final. |

**Recomendação:** começar como assistente. A linha "quando investir/retirar" vira **"a probabilidade de a tese X se confirmar nos próximos 30 dias subiu de 40% para 65% por causa destes 3 eventos"**. O usuário decide.

## 3. Viabilidade técnica — o que é fácil, o que é difícil

### Fácil (existem componentes prontos)
- Ingestão de filings SEC (EDGAR tem API gratuita) e CVM (mais bagunçado, mas viável).
- Scraping de Reddit (API oficial), feeds de notícias (RSS, NewsAPI).
- LLM para sumarização, extração de guidance, detecção de mudança de tom.
- Detecção de changepoint em séries (`ruptures`, `bayesian-changepoint-detection`).

### Médio
- **Extração estruturada de guidance numérico** de transcripts. LLMs base fazem razoavelmente; fine-tuning melhora consideravelmente. Dataset não existe pronto — precisa rotular.
- **X/Twitter scraping**: API oficial é cara (~US$ 5k/mês para volume útil). Alternativas (Nitter, scraping headless) são instáveis e violam ToS.
- **Junção de sinais multi-fonte** sem virar ruído.

### Difícil (onde projetos morrem)
- **Calibração real**: dizer "60% de confiança" e isso ser 60% de fato exige backtests longos e honestos. Conformal prediction ajuda mas não é mágica.
- **Evitar overfitting a narrativas passadas**: o modelo aprende que "X subiu quando Y aconteceu em 2023" e aplica em 2026 quando o regime mudou.
- **Detecção de regime**: mercados mudam de regime sem aviso. Modelo bayesiano detecta *depois* que mudou.
- **Ground truth para teses**: como avaliar se uma tese de 6 meses estava "certa"? Definir métrica é metade do problema.

## 4. Arquitetura proposta

```
┌─────────────────────────────────────────────────────────────┐
│                       FONTES DE DADOS                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ SEC EDGAR    │ Reddit API   │ X/Bluesky    │ Preço/Volume   │
│ CVM          │ HN, fóruns   │ Substack RSS │ (Yahoo, Polygon)│
│ Transcripts  │ Discord (opt)│ News (RSS)   │ FRED (macro)    │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬────────┘
       │              │              │               │
       ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE INGESTÃO                        │
│  Workers (cron/fila) → normalização → dedupe → storage      │
│  Postgres + S3 (raw) + pgvector (embeddings)                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE EXTRAÇÃO (LLM)                    │
│  • Sumarização por documento                                 │
│  • Extração estruturada: guidance, riscos, mudanças de tom   │
│  • Entidades: tickers, pessoas, produtos                     │
│  • Embedding semântico para busca/clustering                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE SINAIS                            │
│  • Changepoint em preço/volume (bayesiano)                   │
│  • Spike de menções por ticker (z-score sobre baseline)      │
│  • Mudança de sentimento agregado (com peso por autor)       │
│  • Divergência narrativa vs. preço                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              CAMADA DE TESE (agente LLM)                     │
│  Para cada ticker em watchlist:                              │
│  1. Recupera contexto (RAG sobre filings + posts recentes)   │
│  2. Gera tese: bull case, bear case, catalisadores           │
│  3. Atribui probabilidade calibrada (ver §6)                 │
│  4. Compara com tese anterior → detecta mudanças             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE / ALERTAS                       │
│  • Dashboard: watchlist, teses ativas, mudanças              │
│  • Alertas (push/email): "confiança em $XYZ caiu 20pp"       │
│  • Chat: perguntas livres sobre qualquer ticker              │
└─────────────────────────────────────────────────────────────┘
```

## 5. Fontes de dados — detalhamento

| Fonte | Custo | Qualidade | Latência | Notas |
|---|---|---|---|---|
| SEC EDGAR | Grátis | Alta | ~minutos | 10-K, 10-Q, 8-K, S-1. Estruturado. |
| CVM | Grátis | Média | ~horas | Formulários menos padronizados que SEC. |
| Earnings transcripts | US$ 100–500/mês (Seeking Alpha, AlphaSense) ou scraping | Alta | ~1 dia após call | Crucial para extração de guidance. |
| Reddit | Grátis (com rate limit) | Variável | Real-time | r/wallstreetbets, r/investing, r/SecurityAnalysis. Filtrar autor por histórico. |
| X/Twitter | US$ 5k+/mês (API Pro) | Alta para FinTwit | Real-time | Considerar começar sem e adicionar depois. |
| Bluesky | Grátis | Crescente | Real-time | Substituto parcial do X. |
| Substack/blogs | Grátis (RSS) | Alta (analistas independentes) | Diária | Curar lista. |
| Preço/volume | Grátis (Yahoo) a US$ 200/mês (Polygon) | Alta | Tempo real (pago) | Yahoo serve para MVP. |
| Macro (FRED) | Grátis | Alta | Diária/mensal | Taxa de juros, CPI, etc. |

**Custo de dados no MVP:** ~US$ 0–200/mês. Para produto sério: ~US$ 1–5k/mês.

## 6. Calibração de confiança — o diferencial real

O ponto mais interessante (e mais difícil) do projeto. Um modelo que diz "60% de confiança" é útil **apenas se** historicamente, das vezes que disse 60%, acertou em ~60%.

### Abordagem em camadas

1. **Predições binárias com horizonte fixo**: "ação X vai superar índice em 30 dias?" Sim/não. Treinável, avaliável.
2. **Temperature scaling** sobre o output do LLM/classificador para corrigir over/underconfidence.
3. **Conformal prediction** para gerar intervalos: em vez de "vai subir 8%", retornar "vai ficar entre -2% e +15% com 80% de confiança".
4. **Reliability diagram** exibido na própria UI: "histórico de calibração deste modelo nos últimos 6 meses".

### Métricas obrigatórias

- **Brier score** (proper scoring rule para probabilidades).
- **Expected Calibration Error (ECE)**.
- **Log loss**.
- Retorno hipotético de uma estratégia ingênua (Kelly fracionário sobre as predições) — *apenas para validação, não para execução*.

## 7. Sinais — exemplos concretos

| Sinal | Como detectar | O que significa |
|---|---|---|
| Mudança de tom em 10-Q | Diff entre risk factors atual vs. anterior, LLM classifica severidade | Sinal *forte* historicamente |
| Insider selling em cluster | EDGAR Form 4, agregado por janela móvel | Sinal moderado, contexto dependente |
| Spike de menções sem catalisador | Z-score de menções por ticker, cruzado com news feed | Possível pump, cautela |
| Divergência analista vs. preço | Embedding das teses recentes vs. retorno realizado | Identifica narrativas obsoletas |
| Changepoint em volume | BOCPD (Bayesian Online Changepoint Detection) | Algo mudou — investigar |
| Mudança de guidance | Comparação estruturada transcript Q vs. Q-1 | Crucial — direto do management |

## 8. Stack técnico sugerido

- **Backend:** Python (FastAPI). Workers com Celery/RQ ou Temporal.
- **DB:** Postgres + pgvector (RAG). TimescaleDB se for guardar muito tick data.
- **LLM:** Claude Sonnet/Opus para extração e geração de tese; modelo open-source pequeno (Llama, Qwen) fine-tuned para extração de guidance, se volume justificar.
- **ML clássico:** scikit-learn, `ruptures` (changepoint), `mapie` (conformal prediction).
- **Frontend:** Next.js + shadcn. Dashboard com watchlist e cards de tese.
- **Mobile (alertas):** push via Expo, ou só email/Telegram bot no MVP.
- **Infra:** começar em uma VPS (Hetzner ~€20/mês). Migrar para AWS/GCP só quando justificar.

## 9. Riscos e mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| **Regulatório (CVM/SEC)** | Alta | Posicionar como ferramenta de pesquisa, não recomendação. Disclaimer claro. Não personalizar conselho por perfil de risco do usuário sem registro. |
| **Overfitting a regime passado** | Alta | Validação walk-forward, não k-fold. Métricas de calibração em janelas recentes separadas. |
| **Custo de LLM escala com watchlist** | Média | Cache agressivo. Só rodar tese completa quando há sinal de mudança. Modelos menores para tarefas repetitivas. |
| **Scraping quebrar** | Média | API oficial onde possível. Múltiplas fontes redundantes. Monitorar taxa de falha. |
| **Hallucination em tese** | Alta | RAG obrigatório com citação. UI mostra fonte de cada afirmação. Tese sem fonte = bug. |
| **Usuário tratar como conselho** | Alta | UX deixa explícito: "isto não é recomendação". Mostrar calibração histórica. |

## 10. Roadmap MVP (3 meses, solo)

### Mês 1 — fundação
- Ingestão SEC EDGAR + Yahoo Finance + Reddit (1–2 subs).
- Storage Postgres + pgvector.
- Pipeline de embedding e busca semântica.
- CLI/dashboard básico: "me mostre o resumo dos últimos filings de $XYZ".

### Mês 2 — extração e tese
- Prompt engineering para extração estruturada de guidance.
- Geração de tese (bull/bear/catalisadores) com Claude.
- Watchlist persistente.
- Detecção de mudança entre teses sucessivas.

### Mês 3 — sinais e calibração
- Changepoint em preço/volume.
- Predições binárias com horizonte de 30d, log das previsões.
- Primeiro reliability diagram (mesmo que com pouca amostra).
- Alertas por email/Telegram.

### Pós-MVP
- Fine-tuning de modelo de extração.
- Adicionar X/Bluesky.
- Conformal prediction para intervalos.
- Backtests honestos com walk-forward.

## 11. Como medir sucesso

Antes de qualquer feature: **definir como saberíamos que está funcionando**.

1. **Calibração:** ECE < 0.10 em horizonte de 30d, mantido por 6 meses.
2. **Utilidade subjetiva:** o próprio usuário (você) confirma que pelo menos 1 em cada 5 teses gerou insight que ele não teria sozinho.
3. **Cobertura:** alertas de mudança de narrativa precedem (não seguem) movimento de preço significativo em pelo menos 30% dos casos.
4. **Custo:** US$/tese gerada < US$ 0.50 em regime estável.

Se 1 e 2 falham depois de 6 meses, repensar premissa.

## 12. Veredito

**Vale a pena construir** — mas como **ferramenta pessoal/educacional** primeiro, validando calibração honestamente antes de qualquer coisa pública. A parte vendável real não é "robô que dá dica", é **"sistema que mostra a sua própria taxa de erro histórica e te ajuda a pensar"**. Isso é raro no mercado e tem público.

A parte de "quando comprar/vender" deve ser a *última* coisa adicionada, e mesmo assim como sugestão com intervalo de confiança, nunca como ordem.

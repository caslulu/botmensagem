# 📋 TODO - BotMensagem

## 🔴 BUGS CRÍTICOS (Prioridade Alta)

### 1. Race Conditions no Scroll de Chats
**Problema:** Sistema pode rolar a lista de chats antes dos novos chats serem carregados no DOM, causando:
- Chats duplicados sendo processados
- Chats sendo pulados
- Loop infinito em alguns casos

**Impacto:** Envios duplicados, mensagens não enviadas para alguns contatos.

**Solução:**
- Aguardar `networkidle` após cada scroll
- Validar que novos chats foram carregados antes de processar
- Adicionar debounce de 2s após scroll
- Comparar lista de chats antes/depois do scroll

**Arquivo:** `src/main/automation/chat-processor.js`, `src/main/automation/whatsapp-service.js`

---

### 2. Memory Leak - Canvas e PDFDocument
**Problema:** Objetos Canvas e PDFDocument não são liberados da memória após uso:
- `createCanvas()` mantém referências em `price-service.js`
- `PDFDocument` mantém buffers grandes em `rta-service.js`
- Múltiplas gerações consecutivas causam consumo excessivo de RAM

**Impacto:** Aplicação pode travar ou crashar após gerar múltiplos PDFs/imagens.

**Solução:**
```javascript
// Exemplo para priceService.js
async generateImage(data) {
  let canvas = null;
  try {
    canvas = createCanvas(1920, 1080);
    // ... processamento ...
    const buffer = canvas.toBuffer('image/png');
    return buffer;
  } finally {
    canvas = null;
    if (global.gc) global.gc(); // Força garbage collection
  }
}
```

**Arquivo:** `src/main/price/services/priceService.js`, `src/main/rta/services/rtaService.js`

---

## 🟡 BUGS MÉDIOS (Prioridade Média)

### 6. Timeout Global de Segurança
**Problema:** Automação pode rodar indefinidamente se houver problemas:
- WhatsApp Web travar
- Site da Progressive não responder
- Loop infinito em processamento de chats

**Impacto:** Usuário precisa forçar encerramento da aplicação.

**Solução:**
- Timeout de 30 minutos para automação WhatsApp
- Timeout de 10 minutos para cotação Progressive
- Timeout de 5 minutos para geração de RTA/Price
- Notificar usuário e parar automaticamente

**Arquivo:** `src/main/automation/automation-controller.js`, `src/main/automation/quotes/providers/progressive.js`

---

### 7. Prevenção de Múltiplos Starts Simultâneos
**Problema:** Se usuário clicar rapidamente em "Iniciar" múltiplas vezes:
- Múltiplas instâncias de automação podem rodar
- Estado fica inconsistente
- Pode causar envios duplicados

**Impacto:** Comportamento imprevisível, possível duplicação de envios.

**Solução:**
```javascript
async start(profileId) {
  if (this.isRunning) {
    throw new Error('Automação já está em execução');
  }
  
  this.isRunning = true;
  
  try {
    await this.runAutomation(profileId);
  } finally {
    this.isRunning = false;
  }
}
```

**Arquivo:** `src/main/automation/automation-controller.js`

---

### 8. Erro Não Reseta Estado Corretamente
**Problema:** Quando ocorre erro durante automação:
- `isRunning` pode ficar `true`
- Botões da UI ficam travados
- Usuário precisa reiniciar aplicação

**Impacto:** UX ruim, necessidade de restart frequente.

**Solução:**
- Garantir `finally` em todas operações async
- Emitir evento de status mesmo em erro
- Resetar todos flags de estado no catch/finally
- Adicionar botão "Resetar Estado" na UI (emergência)

**Arquivo:** `src/main/automation/automation-controller.js`

---

### 9. Validação de Assets Antes de Usar
**Problema:** Sistema não valida se arquivos de assets existem antes de usar:
- Fontes (.otf)
- Imagens (.png)
- Templates PDF
- Pode crashar em produção se assets estiverem corrompidos ou ausentes

**Impacto:** Crash inesperado, erros difíceis de debugar.

**Solução:**
```javascript
constructor() {
  // Validar assets na inicialização
  const requiredAssets = [
    path.join(this.assetsDir, 'fonts', 'fonte.otf'),
    path.join(this.assetsDir, 'images', 'template.png')
  ];
  
  for (const asset of requiredAssets) {
    if (!fs.existsSync(asset)) {
      throw new Error(`Asset obrigatório não encontrado: ${asset}`);
    }
  }
}
```

**Arquivo:** `src/main/price/services/priceService.js`, `src/main/rta/services/rtaService.js`

---

### 10. Retry Automático em Falhas de API (Trello)
**Problema:** Se API do Trello estiver fora ou lenta:
- Requisição falha imediatamente
- Usuário perde dados do formulário
- Sem feedback adequado

**Impacto:** Perda de dados, frustração do usuário.

**Solução:**
```javascript
async addCard(listId, cardData, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, { timeout: 10000 });
      return response.data;
    } catch (error) {
      // Rate limit - espera exponencial
      if (error.response?.status === 429) {
        const waitTime = (i + 1) * 2000;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      // Última tentativa - falha definitiva
      if (i === retries - 1) throw error;
      
      // Retry com delay
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

**Arquivo:** `src/main/trello/services/trelloService.js`

---

### 11. Rate Limiting do Trello
**Problema:** Trello tem limites de requisições:
- 100 requests/10 segundos por token
- 300 requests/minuto por token
- Sistema pode ser bloqueado se ultrapassar

**Impacto:** API Trello pode bloquear temporariamente o token.

**Solução:**
- Implementar fila de requisições
- Adicionar throttle de 100ms entre requests
- Detectar erro 429 (Too Many Requests)
- Implementar exponential backoff

**Arquivo:** `src/main/trello/services/trelloService.js`

---

## 🟢 MELHORIAS E FEATURES (Prioridade Baixa)

### 12. Agendamento de Mensagens
**Descrição:** Permitir agendar envios para horários específicos.

**Benefícios:**
- Evitar envios em horários inadequados (madrugada, fins de semana)
- Parecer mais "humano" e profissional
- Reduzir risco de ban do WhatsApp

**Implementação:**
- UI: Seletor de data/hora no formulário de perfil
- Backend: Armazenar `scheduledTime` no perfil
- Verificar hora antes de iniciar automação
- Adicionar fila de agendamentos pendentes

**Arquivo:** Novo módulo `src/main/automation/scheduler.js`

---

### 13. Blacklist de Contatos
**Descrição:** Permitir marcar contatos para nunca receber mensagens novamente.

**Benefícios:**
- Respeitar quem não quer receber
- Compliance com LGPD/privacidade
- Evitar bloqueios e reports de spam
- Reduzir risco de ban

**Implementação:**
- UI: Botão "Adicionar à blacklist" durante/após envios
- Armazenar lista em JSON: `data/blacklist.json`
- Verificar blacklist antes de enviar em `chat-processor.js`
- Opção de importar/exportar CSV

**Arquivo:** Novo módulo `src/main/automation/blacklist-manager.js`

---

### 14. Estatísticas e Relatórios
**Descrição:** Dashboard com métricas de uso.

**Métricas:**
- Total de mensagens enviadas (hoje, semana, mês, total)
- Taxa de sucesso/falha
- Tempo médio de envio
- Chats bloqueados/ignorados
- Histórico de envios por perfil
- Gráficos de tendência

**Implementação:**
- Armazenar eventos em `data/stats.json`
- Nova tela na UI: "Estatísticas"
- Gráficos com Chart.js
- Exportar relatório PDF/CSV

**Arquivo:** Novo módulo `src/main/services/stats-service.js`

---

### 15. Preview de Mensagens
**Descrição:** Visualizar como mensagem ficará antes de enviar.

**Recursos:**
- Preview de texto formatado
- Preview de imagem anexada
- Testar variáveis dinâmicas
- Enviar mensagem de teste para si mesmo

**Implementação:**
- Modal na UI com preview
- Renderizar markdown se houver
- Mostrar imagem em tamanho real
- Botão "Enviar para mim" (testa envio)

**Arquivo:** `src/renderer/index.html`, novo componente de preview

---

### 16. Variáveis Dinâmicas nas Mensagens
**Descrição:** Personalizar mensagens com variáveis.

**Variáveis suportadas:**
- `{{nome}}` - Nome do contato (extraído do chat)
- `{{empresa}}` - Nome da empresa (configurável)
- `{{data}}` - Data atual
- `{{hora}}` - Hora atual
- Custom: usuário define suas próprias

**Exemplo:**
```
Olá {{nome}}, tudo bem?

Sou da {{empresa}} e gostaria de...

Atenciosamente,
{{meu_nome}}
```

**Implementação:**
- Parser de variáveis em `message-formatter.js`
- UI para definir variáveis customizadas
- Extrair nome do chat do WhatsApp
- Substituir variáveis antes do envio

**Arquivo:** `src/main/utils/message-formatter.js`

---

### 17. Templates de Mensagens
**Descrição:** Salvar e reutilizar modelos de mensagens.

**Recursos:**
- Categorias: Vendas, Suporte, Cobrança, etc.
- Quick access: Dropdown com templates
- Editar templates salvos
- Importar/exportar templates

**Implementação:**
- Armazenar em `data/message-templates.json`
- UI: Seção "Templates" com CRUD
- Botão "Usar template" no formulário de perfil
- Campos: nome, categoria, texto, imagem (opcional)

**Arquivo:** Novo módulo `src/main/services/template-service.js`

---

### 18. Modo "Teste Seguro"
**Descrição:** Enviar para poucos contatos primeiro para validar mensagem.

**Fluxo:**
1. Usuário configura mensagem e limite (ex: 1000 chats)
2. Sistema envia para apenas 5 chats primeiro
3. Pausa e pede confirmação: "Mensagem OK?"
4. Se sim, continua com resto dos envios
5. Se não, cancela e permite editar

**Benefícios:**
- Evitar enviar mensagem errada para milhares
- Validar formatação e imagem
- Segurança adicional

**Implementação:**
- Flag `testMode` nos perfis
- Pausar após X envios se test mode ativo
- Modal de confirmação na UI
- Continuar ou cancelar

**Arquivo:** `src/main/automation/chat-processor.js`

---

### 19. Detecção e Filtro de Grupos
**Descrição:** Permitir incluir/excluir grupos dos envios.

**Opções:**
- Enviar apenas para contatos individuais
- Enviar apenas para grupos
- Enviar para ambos (atual)
- Filtrar grupos por nome/quantidade de membros

**Implementação:**
- Detectar ícone de grupo no WhatsApp Web
- Adicionar filtro em `whatsapp-service.js`
- Checkbox na UI: "Incluir grupos"
- Opção: "Apenas grupos com X+ membros"

**Arquivo:** `src/main/automation/whatsapp-service.js`

---

### 20. Pausar e Retomar Automação
**Descrição:** Pausar envios sem perder progresso.

**Funcionalidade:**
- Botão "Pausar" (além de "Parar")
- Salvar estado atual: chats processados, posição
- Botão "Retomar" carrega estado salvo
- Persistir entre fechamentos da aplicação

**Implementação:**
- Salvar `processedChats` em arquivo JSON
- Flag `isPaused` (diferente de `stopRequested`)
- Carregar estado ao retomar
- Continuar de onde parou

**Arquivo:** `src/main/automation/automation-controller.js`, `src/main/automation/chat-processor.js`

---

### 21. Webhook/Notificações
**Descrição:** Notificar quando automação concluir.

**Métodos de notificação:**
- Webhook HTTP (POST para URL customizada)
- Email
- Notificação desktop nativa
- Telegram bot

**Payload do webhook:**
```json
{
  "event": "automation_completed",
  "profile": "Thiago",
  "sent": 150,
  "failed": 2,
  "duration": "15m 32s",
  "timestamp": "2025-11-15T14:30:00Z"
}
```

**Implementação:**
- Campo "Webhook URL" nos perfis
- Enviar POST ao concluir
- Retry em caso de falha
- Log de webhooks enviados

**Arquivo:** Novo módulo `src/main/services/webhook-service.js`

---

### 22. Integração com Google Sheets
**Descrição:** Exportar histórico de envios para planilha.

**Recursos:**
- Conectar com Google Sheets API
- Exportar estatísticas automaticamente
- Importar lista de contatos da planilha
- Atualizar status de envio em tempo real

**Implementação:**
- OAuth2 com Google
- Biblioteca `googleapis`
- UI para conectar/autorizar
- Mapear colunas: Nome, Número, Status, Data

**Arquivo:** Novo módulo `src/main/services/sheets-service.js`

---

### 23. IA para Respostas Automáticas
**Descrição:** Responder perguntas comuns automaticamente.

**Fluxo:**
1. Sistema monitora mensagens recebidas
2. Detecta perguntas comuns (preço, horário, etc)
3. Envia resposta automática via ChatGPT/Claude
4. Notifica usuário sobre interação

**Casos de uso:**
- Atendimento 24/7
- Qualificar leads automaticamente
- Escalar suporte

**Implementação:**
- Integração com OpenAI API ou Anthropic
- Configurar prompts/contexto por perfil
- UI para ativar/desativar IA
- Limite de tokens/custo

**Arquivo:** Novo módulo `src/main/services/ai-service.js`

---

### 24. CRM Simples Integrado
**Descrição:** Gerenciar relacionamento com contatos.

**Recursos:**
- Histórico de conversas por contato
- Tags e categorias (Cliente, Lead, Inativo)
- Anotações personalizadas
- Follow-up automático
- Pipeline de vendas básico

**Telas:**
- Lista de contatos
- Detalhes do contato
- Timeline de interações
- Dashboard de pipeline

**Implementação:**
- Banco de dados local (SQLite)
- Nova seção na UI: "CRM"
- Armazenar interações automaticamente
- Sincronizar com WhatsApp

**Arquivo:** Novo módulo `src/main/services/crm-service.js`

---

### 25. Multi-Conta WhatsApp
**Descrição:** Gerenciar múltiplas contas simultaneamente.

**Benefícios:**
- Distribuir carga de envios
- Backup se uma conta for banida
- Segmentar públicos diferentes
- Escalabilidade

**Implementação:**
- Múltiplas sessões do Playwright
- UI para adicionar/gerenciar contas
- Alternar entre contas
- Envios paralelos (cada conta envia parte)

**Desafios:**
- Consumo de RAM/CPU
- Complexidade de UI
- Sincronização de estado

**Arquivo:** `src/main/automation/browser-manager.js` (refatoração)

---

### 26. Análise de Sentimento
**Descrição:** Analisar respostas recebidas.

**Métricas:**
- Positivas vs Negativas vs Neutras
- Palavras-chave mencionadas
- Taxa de resposta
- Tempo médio de resposta

**Visualização:**
- Gráfico de pizza (sentimentos)
- Nuvem de palavras
- Score de satisfação

**Implementação:**
- Biblioteca de NLP (natural language processing)
- Ou integração com API (Google NLP, AWS Comprehend)
- Processar mensagens recebidas
- Armazenar análise em stats

**Arquivo:** Novo módulo `src/main/services/sentiment-service.js`

---

### 27. Modo WhatsApp Business API
**Descrição:** Suporte à API oficial do WhatsApp Business.

**Vantagens:**
- Compliance oficial
- Templates aprovados pelo WhatsApp
- Maior limite de envios
- Sem risco de ban

**Requisitos:**
- Cliente precisa ter conta Business verificada
- Custos por mensagem
- Processo de aprovação de templates

**Implementação:**
- Detectar se cliente tem API disponível
- Migração suave entre scraping e API
- UI para gerenciar templates aprovados
- Fallback para scraping se API indisponível

**Arquivo:** Novo módulo `src/main/services/whatsapp-business-api.js`

---

### 28. Logs Estruturados com Níveis
**Problema atual:** Logs são simples console.log sem estrutura.

**Melhorias:**
- Níveis: DEBUG, INFO, WARN, ERROR, FATAL
- Timestamps automáticos
- Salvar em arquivo rotativo
- Filtrar por nível na UI
- Exportar logs para análise

**Implementação:**
```javascript
logger.info('Mensagem enviada', { chat: 'João', time: 1500 });
logger.error('Falha no envio', { error: err.message, stack: err.stack });
```

**Biblioteca:** Winston ou Pino

**Arquivo:** `src/main/automation/utils/logger.js` (refatoração)

---

### 29. Modo Debug Avançado
**Descrição:** Facilitar debugging para desenvolvedores.

**Recursos:**
- Screenshots automáticos em cada etapa
- Gravar vídeo da automação
- Logs verbosos com trace completo
- Pausar em breakpoints customizados
- Inspecionar estado em tempo real

**Ativação:**
- Variável de ambiente `DEBUG=true`
- Ou checkbox na UI

**Implementação:**
- Playwright já suporta screenshots/vídeo
- Salvar em `debug/` pasta
- Adicionar traces do Playwright

**Arquivo:** `src/main/automation/automation-controller.js`

---

### 30. Atualização Automática da Aplicação
**Descrição:** Notificar e instalar atualizações automaticamente.

**Fluxo:**
1. App verifica GitHub Releases ao iniciar
2. Se nova versão disponível, notifica usuário
3. Usuário clica "Atualizar"
4. Download e instalação automática
5. Reinicia app com nova versão

**Implementação:**
- electron-updater (já parcialmente implementado)
- Assinar releases com certificado
- Delta updates (apenas diff)
- Rollback em caso de erro

**Arquivo:** `src/main/updater.js` (melhorias)

---

### 31. Backup e Restore de Configurações
**Descrição:** Backup de perfis, templates, estatísticas.

**Recursos:**
- Backup automático diário
- Exportar manualmente (ZIP)
- Importar backup
- Sincronizar com cloud (Google Drive, Dropbox)

**Implementação:**
- Compactar pasta `data/`
- Salvar em local seguro
- UI: Botão "Backup" e "Restore"
- Validar integridade ao restaurar

**Arquivo:** Novo módulo `src/main/services/backup-service.js`

---

### 32. Testes Automatizados
**Descrição:** Garantir qualidade do código.

**Tipos de teste:**
- Unitários: Funções isoladas
- Integração: Módulos juntos
- E2E: Fluxo completo de automação

**Ferramentas:**
- Jest para unitários
- Playwright Test para E2E
- Coverage report

**Implementação:**
- Pasta `tests/`
- CI/CD com GitHub Actions
- Rodar testes antes de build/publish

**Arquivo:** `tests/` (nova estrutura)

---

### 33. Temas Escuro/Claro
**Descrição:** Permitir escolher tema visual.

**Implementação:**
- CSS variables para cores
- Toggle na UI
- Salvar preferência em localStorage
- Modo automático (seguir SO)

**Arquivo:** `src/renderer/styles.css`, `src/renderer/renderer.js`

---

### 34. Internacionalização (i18n)
**Descrição:** Suporte a múltiplos idiomas.

**Idiomas:**
- Português (atual)
- Inglês
- Espanhol

**Implementação:**
- Biblioteca i18next
- Arquivos de tradução JSON
- Seletor de idioma na UI
- Detectar idioma do SO

**Arquivo:** Novo módulo `src/main/services/i18n.js`

---

### 35. Assistente de Configuração (Wizard)
**Descrição:** Guiar novos usuários na primeira execução.

**Etapas:**
1. Bem-vindo
2. Configurar Trello (opcional)
3. Criar primeiro perfil
4. Tutorial rápido
5. Pronto!

**Implementação:**
- Modal step-by-step na UI
- Salvar flag `firstRun` em config
- Mostrar apenas na primeira vez

**Arquivo:** `src/renderer/wizard.html` (nova tela)

---

### 36. Suporte a Envio de Áudio e Vídeo
**Descrição:** Permitir enviar arquivos de áudio e vídeo, não apenas imagens.

**Recursos:**
- Upload de .mp3, .mp4, .ogg
- Validação de tamanho de arquivo
- Preview de mídia

**Implementação:**
- Atualizar `message-sender.js` para aceitar outros tipos MIME
- Atualizar UI para input de arquivos genéricos
- Tratamento de erros específicos de upload

**Arquivo:** `src/main/automation/message-sender.js`

---

## 📊 Resumo de Prioridades

| Prioridade | Quantidade | Categoria |
|------------|------------|-----------|
| 🔴 Alta    | 5 bugs     | Bugs Críticos |
| 🟡 Média   | 6 bugs     | Bugs Médios |
| 🟢 Baixa   | 24 items   | Features e Melhorias |

### Roadmap Sugerido

**Sprint 1 (1-2 semanas):**
- Bugs críticos #1-5

**Sprint 2 (2-3 semanas):**
- Bugs médios #6-11
- Features #12-14 (Agendamento, Blacklist, Estatísticas)

**Sprint 3 (3-4 semanas):**
- Features #15-20 (Preview, Variáveis, Templates, etc)

**Sprint 4+ (Backlog):**
- Features avançadas #21-36 (IA, CRM, Multi-conta, etc)

---

## 🎯 Próximos Passos Imediatos

1. ✅ Corrigir bugs críticos primeiro
2. ✅ Implementar features essenciais (agendamento, blacklist)
3. ✅ Adicionar testes automatizados
4. ✅ Melhorar documentação
5. ✅ Publicar versão estável com correções

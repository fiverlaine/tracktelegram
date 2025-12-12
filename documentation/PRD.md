# 📋 Product Requirements Document (PRD)
## TrackGram - Sistema de Rastreamento para Telegram

---

**Versão:** 1.0.0  
**Data:** 11 de Dezembro de 2024  
**Autor:** Equipe TrackGram  
**Status:** Em Desenvolvimento

---

## 📑 Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Problema e Oportunidade](#2-problema-e-oportunidade)
3. [Objetivos e Métricas de Sucesso](#3-objetivos-e-métricas-de-sucesso)
4. [Público-Alvo e Personas](#4-público-alvo-e-personas)
5. [Escopo do Produto](#5-escopo-do-produto)
6. [Requisitos Funcionais](#6-requisitos-funcionais)
7. [Requisitos Não-Funcionais](#7-requisitos-não-funcionais)
8. [Arquitetura Técnica](#8-arquitetura-técnica)
9. [Modelo de Dados](#9-modelo-de-dados)
10. [Integrações](#10-integrações)
11. [User Stories](#11-user-stories)
12. [Wireframes e Fluxos](#12-wireframes-e-fluxos)
13. [Modelo de Negócio](#13-modelo-de-negócio)
14. [Roadmap](#14-roadmap)
15. [Riscos e Mitigações](#15-riscos-e-mitigações)
16. [Glossário](#16-glossário)

---

## 1. Visão Geral do Produto

### 1.1 Descrição

O **TrackGram** é um SaaS (Software as a Service) de rastreamento e atribuição de conversões para campanhas de anúncios que direcionam tráfego para canais e grupos do Telegram. O sistema resolve o problema de **"cegueira de dados"** em anúncios para Telegram, permitindo que anunciantes rastreiem com precisão a jornada do usuário desde o clique no anúncio até a entrada efetiva no canal.

### 1.2 Proposta de Valor

> **"Transforme cliques em dados mensuráveis. Saiba exatamente quantos leads dos seus anúncios realmente entraram no seu canal do Telegram."**

### 1.3 Diferenciais Competitivos

| Aspecto | TrackGram | Soluções Tradicionais |
|---------|-----------|----------------------|
| Atribuição | Precisa (link único por visitante) | Estimativa por timing |
| UX do Lead | Direto para o canal (sem bot) | Passa por bot intermediário |
| Integração CAPI | Nativa e otimizada | Manual ou inexistente |
| Event Match Quality | Alto (fbc, fbp, user_agent) | Baixo ou médio |

### 1.4 Principais Recursos

- 🔗 **Links de Rastreamento Dinâmicos**: Cada visitante recebe um link de convite único
- 📊 **Dashboard em Tempo Real**: Métricas de pageviews, clicks, entradas e saídas
- 🎯 **Facebook CAPI**: Integração server-side para melhor atribuição
- 📱 **Multi-Canal**: Suporte a múltiplos canais/grupos do Telegram
- 📈 **Análise de Retenção**: Acompanhe quem entra e quem sai

---

## 2. Problema e Oportunidade

### 2.1 O Problema

Anunciantes que promovem canais/grupos do Telegram via Facebook Ads, Google Ads ou outras plataformas enfrentam um problema crítico: **não conseguem medir com precisão quantos cliques se converteram em entradas reais no canal**.

#### Impactos do Problema:

1. **Desperdício de Budget**: Sem dados precisos, é impossível otimizar campanhas
2. **Decisões às Cegas**: Anunciantes não sabem quais criativos/audiências funcionam
3. **ROAS Incalculável**: Retorno sobre investimento impossível de medir
4. **Perda de Otimização**: Facebook não recebe eventos de conversão para otimizar

### 2.2 A Oportunidade

- **Mercado de Telegram Marketing** em crescimento acelerado
- **Milhares de infoprodutores** e empresas usam Telegram para comunidades
- **Nenhuma solução nativa** do Telegram ou Facebook resolve o problema
- **Concorrência limitada**: Poucas soluções especializadas no mercado BR

### 2.3 Validação do Problema

| Indicador | Dado |
|-----------|------|
| Usuários de Telegram no Brasil | +65 milhões |
| Crescimento de grupos/canais comerciais | +200% ao ano |
| Anunciantes afetados | ~80% não rastreiam conversões |

---

## 3. Objetivos e Métricas de Sucesso

### 3.1 Objetivos de Negócio

| Objetivo | Meta (6 meses) | Meta (12 meses) |
|----------|----------------|-----------------|
| Usuários Ativos | 500 | 2.000 |
| MRR (Monthly Recurring Revenue) | R$ 50.000 | R$ 200.000 |
| Churn Rate | < 8% | < 5% |
| NPS (Net Promoter Score) | > 50 | > 70 |

### 3.2 Objetivos de Produto

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Precisão de Atribuição | Taxa de match | > 95% |
| Event Match Quality (Facebook) | Score EMQ | > 7/10 |
| Tempo de Setup | Primeiro funil ativo | < 10 minutos |
| Uptime | Disponibilidade | 99.9% |

### 3.3 KPIs do Produto

```
📊 Métricas de Aquisição
├── Signups por período
├── Taxa de ativação (criou primeiro funil)
└── Fonte de aquisição

📈 Métricas de Engajamento
├── DAU/MAU (Daily/Monthly Active Users)
├── Eventos rastreados por usuário
└── Funis ativos por usuário

💰 Métricas de Monetização
├── Conversão Free → Paid
├── ARPU (Average Revenue Per User)
└── LTV (Lifetime Value)

🔄 Métricas de Retenção
├── Retention D1, D7, D30
├── Churn Rate
└── Resurrection Rate
```

---

## 4. Público-Alvo e Personas

### 4.1 Segmentos de Mercado

| Segmento | Tamanho | Potencial |
|----------|---------|-----------|
| Infoprodutores | 50.000+ no Brasil | Alto |
| Agências de Tráfego | 5.000+ | Muito Alto |
| E-commerces | 10.000+ | Médio |
| Criadores de Conteúdo | 100.000+ | Alto |

### 4.2 Personas

#### Persona 1: João - Infoprodutor

| Atributo | Descrição |
|----------|-----------|
| **Idade** | 28-40 anos |
| **Cargo** | Dono de negócio digital |
| **Experiência** | Intermediária com tráfego pago |
| **Objetivo** | Vender cursos/mentorias via grupo VIP |
| **Dor Principal** | "Gasto R$5.000/mês em ads mas não sei quantos realmente entram no grupo" |
| **Comportamento** | Usa Facebook Ads, precisa de métricas para escalar |
| **Budget** | R$ 100-500/mês em ferramentas |

#### Persona 2: Maria - Gestora de Tráfego

| Atributo | Descrição |
|----------|-----------|
| **Idade** | 25-35 anos |
| **Cargo** | Gestora de tráfego em agência |
| **Experiência** | Avançada com tráfego pago |
| **Objetivo** | Entregar resultados mensuráveis para clientes |
| **Dor Principal** | "Cliente cobra métricas que não consigo provar" |
| **Comportamento** | Gerencia múltiplas contas, precisa de relatórios |
| **Budget** | R$ 200-500/mês por cliente |

#### Persona 3: Pedro - Dono de Agência

| Atributo | Descrição |
|----------|-----------|
| **Idade** | 30-45 anos |
| **Cargo** | CEO de agência de marketing |
| **Experiência** | Estratégica |
| **Objetivo** | Oferecer diferencial competitivo |
| **Dor Principal** | "Preciso de uma solução white-label para meus clientes" |
| **Comportamento** | Busca parcerias e integrações |
| **Budget** | R$ 500+/mês |

### 4.3 Jobs to be Done

| Quando... | Eu quero... | Para que... |
|-----------|-------------|-------------|
| Crio uma campanha de Telegram | Ter um link de rastreamento | Saiba quantos clicaram |
| Um lead clica no meu anúncio | Que ele vá direto pro canal | Não perca conversões |
| Um lead entra no canal | Que o Facebook receba o evento | A campanha seja otimizada |
| Analiso resultados | Ver métricas consolidadas | Tome decisões baseadas em dados |

---

## 5. Escopo do Produto

### 5.1 Funcionalidades Incluídas (MVP)

#### ✅ Core Features

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Autenticação** | Login via Magic Link (email) | P0 |
| **Dashboard** | Métricas em tempo real | P0 |
| **Pixels** | CRUD de pixels Facebook | P0 |
| **Canais** | CRUD de bots/canais Telegram | P0 |
| **Funis** | Criar links de rastreamento | P0 |
| **Tracking Page** | Página intermediária de captura | P0 |
| **Webhook Telegram** | Processar eventos do Telegram | P0 |
| **Facebook CAPI** | Enviar eventos de conversão | P0 |

#### ✅ Features Secundárias

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **UTMs** | Parâmetros de campanha | P1 |
| **Logs** | Histórico de eventos | P1 |
| **Domínios** | Domínios personalizados | P1 |
| **Mensagens** | Mensagens automáticas | P2 |
| **Postbacks** | Webhooks para integrações | P2 |
| **Subscription** | Planos e pagamentos | P1 |

### 5.2 Funcionalidades Excluídas (Futuro)

| Feature | Motivo | Previsão |
|---------|--------|----------|
| White Label | Complexidade alta | v2.0 |
| API Pública | Demanda de enterprise | v2.0 |
| App Mobile | Foco inicial em web | v3.0 |
| Integrações Ads (Google, TikTok) | Escopo inicial Facebook | v2.0 |
| IA/ML para previsões | Requer dados históricos | v3.0 |

### 5.3 Premissas

1. O usuário já possui um bot do Telegram configurado
2. O usuário tem acesso ao Facebook Business Manager
3. O usuário tem conhecimento básico de tráfego pago
4. Conexão estável com internet para webhooks

### 5.4 Restrições

1. **Técnicas**: Limitações da API do Telegram (rate limits)
2. **Regulatórias**: LGPD para dados de usuários brasileiros
3. **Plataforma**: Políticas do Facebook para CAPI
4. **Orçamento**: MVP deve ser concluído com recursos limitados

---

## 6. Requisitos Funcionais

### 6.1 Módulo de Autenticação

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-AUTH-01 | Login Magic Link | Usuário recebe link de acesso por email | P0 |
| RF-AUTH-02 | Sessão Persistente | Sessão mantida por 7 dias | P0 |
| RF-AUTH-03 | Logout | Usuário pode encerrar sessão | P0 |
| RF-AUTH-04 | Proteção de Rotas | Páginas privadas requerem autenticação | P0 |

### 6.2 Módulo de Dashboard

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-DASH-01 | Cards de Métricas | Exibir Pageviews, Clicks, Entradas, Saídas | P0 |
| RF-DASH-02 | Gráfico Temporal | Evolução de métricas por dia | P0 |
| RF-DASH-03 | Filtro de Data | Filtrar por período (hoje, 7d, 30d, custom) | P1 |
| RF-DASH-04 | Filtro de Funil | Filtrar métricas por funil específico | P1 |
| RF-DASH-05 | Tabela de Retenção | Exibir retenção diária | P1 |
| RF-DASH-06 | Export de Dados | Exportar relatório em CSV/PDF | P2 |

### 6.3 Módulo de Pixels

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-PIX-01 | Criar Pixel | Cadastrar Pixel ID e Access Token | P0 |
| RF-PIX-02 | Listar Pixels | Exibir todos os pixels do usuário | P0 |
| RF-PIX-03 | Editar Pixel | Atualizar dados do pixel | P0 |
| RF-PIX-04 | Excluir Pixel | Remover pixel (soft delete) | P0 |
| RF-PIX-05 | Validar Token | Testar conexão com Facebook API | P1 |

### 6.4 Módulo de Canais (Telegram)

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-CH-01 | Criar Canal | Cadastrar Bot Token e dados | P0 |
| RF-CH-02 | Validar Bot | Verificar token via Telegram API | P0 |
| RF-CH-03 | Detectar Chat ID | Identificar ID do canal automaticamente | P0 |
| RF-CH-04 | Configurar Webhook | Registrar webhook no Telegram | P0 |
| RF-CH-05 | Status do Webhook | Exibir status da conexão | P0 |
| RF-CH-06 | Listar Canais | Exibir todos os canais do usuário | P0 |
| RF-CH-07 | Editar Canal | Atualizar dados do canal | P0 |
| RF-CH-08 | Excluir Canal | Remover canal (desativa webhook) | P0 |

### 6.5 Módulo de Funis

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-FUN-01 | Criar Funil | Selecionar Pixel + Canal + Nome | P0 |
| RF-FUN-02 | Gerar Slug | Criar slug único para URL | P0 |
| RF-FUN-03 | Listar Funis | Exibir todos os funis com métricas | P0 |
| RF-FUN-04 | Editar Funil | Atualizar configurações | P0 |
| RF-FUN-05 | Excluir Funil | Remover funil (mantém eventos) | P0 |
| RF-FUN-06 | Copiar Link | Botão para copiar URL do funil | P0 |
| RF-FUN-07 | QR Code | Gerar QR Code do link | P2 |

### 6.6 Módulo de Rastreamento

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-TRK-01 | Capturar fbclid | Extrair fbclid da URL do anúncio | P0 |
| RF-TRK-02 | Gerar fbc/fbp | Criar cookies de rastreamento | P0 |
| RF-TRK-03 | Gerar visitor_id | Criar identificador único | P0 |
| RF-TRK-04 | Registrar Pageview | Salvar evento de visualização | P0 |
| RF-TRK-05 | Registrar Click | Salvar evento de clique | P0 |
| RF-TRK-06 | Gerar Invite Link | Criar link único do Telegram | P0 |
| RF-TRK-07 | Redirecionar | Enviar usuário para o Telegram | P0 |
| RF-TRK-08 | Capturar User Agent | Armazenar navegador/dispositivo | P0 |
| RF-TRK-09 | Capturar IP | Armazenar IP do visitante | P1 |

### 6.7 Módulo de Webhook

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-WH-01 | Processar chat_member | Detectar entrada/saída | P0 |
| RF-WH-02 | Extrair visitor_id | Obter do invite_link.name | P0 |
| RF-WH-03 | Vincular Visitante | Associar visitor_id ao telegram_user_id | P0 |
| RF-WH-04 | Registrar Join | Salvar evento de entrada | P0 |
| RF-WH-05 | Registrar Leave | Salvar evento de saída | P0 |
| RF-WH-06 | Enviar CAPI | Disparar evento para Facebook | P0 |
| RF-WH-07 | Auto-approve | Aprovar solicitações automaticamente | P1 |
| RF-WH-08 | Logging | Registrar todas as requisições | P1 |

### 6.8 Módulo de Assinatura

| ID | Requisito | Descrição | Prioridade |
|----|-----------|-----------|------------|
| RF-SUB-01 | Exibir Planos | Mostrar opções de assinatura | P0 |
| RF-SUB-02 | Checkout | Redirecionar para gateway | P0 |
| RF-SUB-03 | Webhook Pagamento | Processar confirmação | P0 |
| RF-SUB-04 | Aplicar Limites | Restringir recursos por plano | P0 |
| RF-SUB-05 | Exibir Status | Mostrar plano atual e uso | P1 |
| RF-SUB-06 | Upgrade/Downgrade | Permitir mudança de plano | P1 |

---

## 7. Requisitos Não-Funcionais

### 7.1 Performance

| ID | Requisito | Métrica | Meta |
|----|-----------|---------|------|
| RNF-PERF-01 | Tempo de Carregamento | TTFB (Time to First Byte) | < 200ms |
| RNF-PERF-02 | Tempo de Resposta API | P95 latência | < 500ms |
| RNF-PERF-03 | Webhook Response | Tempo de processamento | < 2s |
| RNF-PERF-04 | Concurrent Users | Usuários simultâneos | 1.000+ |

### 7.2 Disponibilidade

| ID | Requisito | Métrica | Meta |
|----|-----------|---------|------|
| RNF-DISP-01 | Uptime | Disponibilidade mensal | 99.9% |
| RNF-DISP-02 | RTO | Recovery Time Objective | < 1h |
| RNF-DISP-03 | RPO | Recovery Point Objective | < 24h |

### 7.3 Segurança

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF-SEC-01 | HTTPS | Toda comunicação via TLS 1.3 |
| RNF-SEC-02 | Autenticação | JWT com refresh tokens |
| RNF-SEC-03 | Row Level Security | Isolamento de dados por usuário |
| RNF-SEC-04 | Criptografia | Tokens sensíveis criptografados |
| RNF-SEC-05 | Rate Limiting | Proteção contra abuso |
| RNF-SEC-06 | LGPD | Conformidade com lei de dados |

### 7.4 Escalabilidade

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF-ESC-01 | Horizontal | Suportar múltiplas instâncias |
| RNF-ESC-02 | Database | Supabase com conexão pooling |
| RNF-ESC-03 | CDN | Assets servidos via edge |
| RNF-ESC-04 | Serverless | API Routes auto-escaláveis |

### 7.5 Usabilidade

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF-UX-01 | Responsivo | Funcional em mobile e desktop |
| RNF-UX-02 | Dark Mode | Interface padrão escura |
| RNF-UX-03 | Acessibilidade | WCAG 2.1 AA |
| RNF-UX-04 | Onboarding | Primeiro funil em < 10 min |

### 7.6 Manutenibilidade

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF-MAN-01 | TypeScript | 100% tipado |
| RNF-MAN-02 | Documentação | Código documentado |
| RNF-MAN-03 | Versionamento | Git com branches estruturados |
| RNF-MAN-04 | CI/CD | Deploy automático via Vercel |

---

## 8. Arquitetura Técnica

### 8.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Vercel    │     │   Supabase  │     │   Telegram  │       │
│  │  (Frontend  │────▶│  (Database  │◀────│    (API)    │       │
│  │  + API)     │     │  + Auth)    │     │             │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                    │              │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Facebook   │     │   Gateway   │     │    CDN      │       │
│  │   (CAPI)    │     │  Pagamento  │     │  (Assets)   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Frontend** | Next.js | 15+ |
| **UI Framework** | React | 19 |
| **Linguagem** | TypeScript | 5 |
| **Styling** | Tailwind CSS | 4 |
| **Componentes** | Shadcn/UI | Latest |
| **Ícones** | Lucide React | Latest |
| **Gráficos** | Recharts | 2.x |
| **Forms** | React Hook Form + Zod | Latest |
| **Database** | PostgreSQL (Supabase) | 15+ |
| **Auth** | Supabase Auth | Latest |
| **Hosting** | Vercel | Latest |
| **API Routes** | Next.js API Routes | Serverless |

### 8.3 Fluxo de Rastreamento

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DE RASTREAMENTO                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1️⃣ ANÚNCIO                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Facebook Ads → seusite.com/t/{slug}?fbclid=xyz                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  2️⃣ TRACKING PAGE                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  • Captura: fbclid, fbc, fbp, User-Agent, IP                    │    │
│  │  • Gera: visitor_id único                                        │    │
│  │  • Salva: evento "pageview" + "click"                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  3️⃣ INVITE API                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  • createChatInviteLink(name: "v_{visitor_id}", member_limit: 1)│    │
│  │  • Salva mapeamento em visitor_telegram_links                    │    │
│  │  • Retorna link único                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  4️⃣ REDIRECT                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Usuário é redirecionado DIRETO para t.me/+XXXXX                 │    │
│  │  (sem bot intermediário = melhor conversão)                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  5️⃣ WEBHOOK                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  • Telegram envia chat_member update                            │    │
│  │  • Extrai visitor_id do invite_link.name                         │    │
│  │  • Recupera dados do click (fbc, fbp, user_agent)               │    │
│  │  • Salva evento "join"                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  6️⃣ FACEBOOK CAPI                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  • Envia evento "Lead" para Facebook                            │    │
│  │  • user_data: { fbc, fbp, client_user_agent, external_id }      │    │
│  │  • event_id para deduplicação                                   │    │
│  │  • action_source: "website"                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Estrutura de Diretórios

```
track-gram/
├── src/
│   ├── app/                     # App Router (Next.js 15)
│   │   ├── (dashboard)/         # Grupo de rotas autenticadas
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── channels/        # Gerenciar canais
│   │   │   ├── pixels/          # Gerenciar pixels
│   │   │   ├── funnels/         # Funis de rastreamento
│   │   │   ├── domains/         # Domínios personalizados
│   │   │   ├── logs/            # Histórico de eventos
│   │   │   ├── messages/        # Mensagens automáticas
│   │   │   ├── postbacks/       # Webhooks externos
│   │   │   ├── utms/            # Parâmetros UTM
│   │   │   └── subscription/    # Planos e assinatura
│   │   ├── api/                 # API Routes
│   │   │   ├── invite/          # Gerar links de convite
│   │   │   ├── track/           # Eventos de tracking
│   │   │   ├── webhook/         # Webhooks Telegram
│   │   │   └── webhooks/        # Webhooks pagamento
│   │   ├── auth/                # Callback de autenticação
│   │   ├── login/               # Página de login
│   │   └── t/[slug]/            # Páginas de tracking
│   ├── components/              # Componentes React
│   │   ├── dashboard/           # Componentes do dashboard
│   │   ├── layout/              # Layout e navegação
│   │   └── ui/                  # Componentes Shadcn/UI
│   ├── config/                  # Configurações
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Utilitários
│   │   ├── supabase/            # Clientes Supabase
│   │   └── facebook-capi.ts     # Integração Facebook
│   └── types/                   # Tipos TypeScript
├── documentation/               # Documentação
├── public/                      # Assets estáticos
└── package.json
```

---

## 9. Modelo de Dados

### 9.1 Diagrama ER

```
┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │     pixels      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◀──┐   │ id (PK)         │
│ email           │   │   │ user_id (FK)    │──┐
│ full_name       │   │   │ name            │  │
│ avatar_url      │   │   │ pixel_id        │  │
│ plan_name       │   │   │ access_token    │  │
│ created_at      │   │   │ created_at      │  │
└─────────────────┘   │   └─────────────────┘  │
                      │                        │
                      │   ┌─────────────────┐  │
                      │   │ telegram_bots   │  │
                      │   ├─────────────────┤  │
                      │   │ id (PK)         │  │
                      ├───│ user_id (FK)    │  │
                      │   │ name            │  │
                      │   │ bot_token       │  │
                      │   │ username        │  │
                      │   │ channel_link    │  │
                      │   │ chat_id         │  │
                      │   │ created_at      │  │
                      │   └─────────────────┘  │
                      │           │            │
                      │           ▼            │
                      │   ┌─────────────────┐  │
                      │   │    funnels      │  │
                      │   ├─────────────────┤  │
                      │   │ id (PK)         │  │
                      ├───│ user_id (FK)    │  │
                      │   │ name            │  │
                      │   │ slug            │  │
                      │   │ pixel_id (FK)   │◀─┘
                      │   │ bot_id (FK)     │◀───
                      │   │ created_at      │
                      │   └─────────────────┘
                      │           │
                      │           ▼
                      │   ┌─────────────────────────┐
                      │   │        events           │
                      │   ├─────────────────────────┤
                      │   │ id (PK)                 │
                      │   │ funnel_id (FK)          │
                      │   │ visitor_id              │
                      │   │ event_type              │
                      │   │ metadata (JSONB)        │
                      │   │ created_at              │
                      │   └─────────────────────────┘
                      │
                      │   ┌─────────────────────────┐
                      │   │ visitor_telegram_links  │
                      │   ├─────────────────────────┤
                      │   │ id (PK)                 │
                      │   │ visitor_id              │
                      │   │ telegram_user_id        │
                      │   │ telegram_username       │
                      │   │ funnel_id (FK)          │
                      │   │ bot_id (FK)             │
                      │   │ linked_at               │
                      │   │ metadata (JSONB)        │
                      │   └─────────────────────────┘
```

### 9.2 Tabelas Detalhadas

#### `profiles`
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NOT NULL | uuid_generate_v4() | PK, FK para auth.users |
| email | TEXT | NOT NULL | - | Email do usuário |
| full_name | TEXT | NULL | - | Nome completo |
| avatar_url | TEXT | NULL | - | URL do avatar |
| plan_name | TEXT | NULL | 'Starter (Teste)' | Plano atual |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Data de criação |

#### `pixels`
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NOT NULL | uuid_generate_v4() | PK |
| user_id | UUID | NOT NULL | - | FK para profiles |
| name | TEXT | NOT NULL | - | Nome identificador |
| pixel_id | TEXT | NOT NULL | - | ID do Pixel Facebook |
| access_token | TEXT | NOT NULL | - | Token CAPI |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Data de criação |

#### `telegram_bots`
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NOT NULL | uuid_generate_v4() | PK |
| user_id | UUID | NOT NULL | - | FK para profiles |
| name | TEXT | NOT NULL | - | Nome identificador |
| bot_token | TEXT | NOT NULL | - | Token do BotFather |
| username | TEXT | NULL | - | @username do bot |
| channel_link | TEXT | NULL | - | Link de convite |
| chat_id | TEXT | NULL | - | ID numérico do chat |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Data de criação |

#### `funnels`
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NOT NULL | uuid_generate_v4() | PK |
| user_id | UUID | NOT NULL | - | FK para profiles |
| name | TEXT | NOT NULL | - | Nome da campanha |
| slug | TEXT | NOT NULL | - | Slug único (UNIQUE) |
| pixel_id | UUID | NOT NULL | - | FK para pixels |
| bot_id | UUID | NOT NULL | - | FK para telegram_bots |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Data de criação |

#### `events`
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NOT NULL | uuid_generate_v4() | PK |
| funnel_id | UUID | NULL | - | FK para funnels |
| visitor_id | TEXT | NOT NULL | - | ID único do visitante |
| event_type | TEXT | NOT NULL | - | pageview/click/join/leave |
| metadata | JSONB | NULL | {} | Dados adicionais |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Data do evento |

#### `visitor_telegram_links`
| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| id | UUID | NOT NULL | uuid_generate_v4() | PK |
| visitor_id | TEXT | NOT NULL | - | ID do visitante |
| telegram_user_id | BIGINT | NOT NULL | 0 | ID do usuário Telegram |
| telegram_username | TEXT | NULL | - | @username |
| funnel_id | UUID | NOT NULL | - | FK para funnels |
| bot_id | UUID | NOT NULL | - | FK para telegram_bots |
| linked_at | TIMESTAMPTZ | NOT NULL | now() | Data da vinculação |
| metadata | JSONB | NULL | {} | Dados do invite link |

### 9.3 Row Level Security (RLS)

```sql
-- Exemplo de políticas RLS
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own pixels"
ON pixels FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own pixels"
ON pixels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own pixels"
ON pixels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own pixels"
ON pixels FOR DELETE
USING (auth.uid() = user_id);
```

---

## 10. Integrações

### 10.1 Facebook Conversions API (CAPI)

#### Endpoint
```
POST https://graph.facebook.com/v18.0/{pixel_id}/events
```

#### Payload de Evento "Lead"

```json
{
  "data": [{
    "event_name": "Lead",
    "event_time": 1702123456,
    "event_id": "lead_1702123456_abc123",
    "action_source": "website",
    "event_source_url": "https://seusite.com/t/campanha",
    "user_data": {
      "fbc": "fb.1.1702123456.AbCdEfGhIj",
      "fbp": "fb.1.1702123456.1234567890",
      "client_user_agent": "Mozilla/5.0...",
      "client_ip_address": "203.0.113.45",
      "external_id": "sha256_hash_visitor_id"
    },
    "custom_data": {
      "telegram_user_id": 123456789,
      "telegram_username": "usuario",
      "content_category": "telegram_group"
    }
  }]
}
```

#### Event Match Quality (EMQ)

| Parâmetro | Impacto | Obrigatório |
|-----------|---------|-------------|
| fbc | ⭐⭐⭐⭐⭐ | Recomendado |
| fbp | ⭐⭐⭐ | Recomendado |
| client_user_agent | ⭐⭐ | Recomendado |
| client_ip_address | ⭐⭐ | Opcional |
| external_id (hashed) | ⭐⭐⭐ | Recomendado |
| email (hashed) | ⭐⭐⭐⭐ | Opcional |

### 10.2 Telegram Bot API

#### Webhook Configuration
```
POST https://api.telegram.org/bot{token}/setWebhook
{
  "url": "https://app.trackgram.com/api/webhook/telegram/{bot_id}",
  "allowed_updates": ["chat_member", "chat_join_request"]
}
```

#### Create Invite Link
```
POST https://api.telegram.org/bot{token}/createChatInviteLink
{
  "chat_id": -100123456789,
  "name": "v_abc123def456",
  "member_limit": 1,
  "expire_date": 1702209856
}
```

#### Webhook Update (chat_member)
```json
{
  "update_id": 123456789,
  "chat_member": {
    "chat": { "id": -100123456789, "title": "Meu Canal" },
    "from": { "id": 987654321 },
    "new_chat_member": {
      "user": { "id": 987654321, "username": "joao" },
      "status": "member"
    },
    "invite_link": {
      "invite_link": "https://t.me/+AbCdEfGh",
      "name": "v_abc123def456",
      "creator": { "id": 111222333 }
    }
  }
}
```

### 10.3 Gateway de Pagamento (Cakto)

#### Webhook de Confirmação
```
POST /api/webhooks/cakto
{
  "event": "payment.confirmed",
  "data": {
    "customer_email": "user@email.com",
    "product_id": "pro_scale",
    "status": "active"
  }
}
```

---

## 11. User Stories

### 11.1 Épico: Configuração Inicial

| ID | Como... | Eu quero... | Para que... | Critérios de Aceite |
|----|---------|-------------|-------------|---------------------|
| US-01 | Novo usuário | Me cadastrar com email | Acessar o sistema | Magic link enviado em < 5s |
| US-02 | Usuário | Fazer login | Acessar minha conta | Redirecionado ao dashboard |
| US-03 | Usuário | Cadastrar meu pixel | Rastrear conversões | Pixel salvo e listado |
| US-04 | Usuário | Cadastrar meu bot | Conectar ao Telegram | Bot validado e salvo |
| US-05 | Usuário | Criar meu primeiro funil | Gerar link de tracking | Link copiável disponível |

### 11.2 Épico: Rastreamento

| ID | Como... | Eu quero... | Para que... | Critérios de Aceite |
|----|---------|-------------|-------------|---------------------|
| US-06 | Lead | Clicar no anúncio | Ir para o canal | Redirecionado em < 3s |
| US-07 | Sistema | Capturar fbclid | Atribuir a conversão | fbc/fbp salvos |
| US-08 | Sistema | Gerar invite único | Rastrear entrada | Link criado com visitor_id |
| US-09 | Sistema | Detectar entrada | Registrar conversão | Evento "join" salvo |
| US-10 | Sistema | Enviar para CAPI | Facebook receber evento | Response 200 + events_received: 1 |

### 11.3 Épico: Dashboard

| ID | Como... | Eu quero... | Para que... | Critérios de Aceite |
|----|---------|-------------|-------------|---------------------|
| US-11 | Usuário | Ver total de pageviews | Saber alcance | Card atualizado em tempo real |
| US-12 | Usuário | Ver total de entradas | Medir conversões | Card atualizado em tempo real |
| US-13 | Usuário | Ver gráfico temporal | Analisar tendências | Dados por dia dos últimos 7d |
| US-14 | Usuário | Filtrar por período | Análise específica | Dados filtrados corretamente |
| US-15 | Usuário | Ver taxa de retenção | Medir churn | Cálculo correto (joins-leaves)/joins |

### 11.4 Épico: Monetização

| ID | Como... | Eu quero... | Para que... | Critérios de Aceite |
|----|---------|-------------|-------------|---------------------|
| US-16 | Usuário | Ver planos disponíveis | Escolher assinatura | 3 planos exibidos |
| US-17 | Usuário | Assinar um plano | Desbloquear recursos | Redirecionado ao checkout |
| US-18 | Sistema | Processar pagamento | Ativar assinatura | Plano atualizado no profile |
| US-19 | Usuário | Ver meus limites | Saber uso atual | Barra de progresso atualizada |

---

## 12. Wireframes e Fluxos

### 12.1 Telas Principais

```
┌──────────────────────────────────────────────────────────────┐
│                        DASHBOARD                              │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Pageviews│ │ Clicks  │ │Entradas │ │ Saídas  │            │
│  │  1,234  │ │   890   │ │   456   │ │   23    │            │
│  │ +12.5%  │ │ +8.3%   │ │ +15.2%  │ │ -5.1%   │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    GRÁFICO                          │     │
│  │     📈 ──────────────────────────                  │     │
│  │                                                     │     │
│  │    [Pageviews] [Clicks] [Entradas] [Saídas]        │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              TABELA DE RETENÇÃO                     │     │
│  │  Dia    │ Entradas │ Saídas │ Retenção             │     │
│  │  11/12  │    45    │   2    │  95.5% ✅            │     │
│  │  10/12  │    38    │   5    │  86.8% ❌            │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────┐
│                         FUNIS                                 │
├──────────────────────────────────────────────────────────────┤
│  [+ Novo Funil]                                   🔍 Buscar  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ 📊 Campanha Black Friday                          │     │
│  │ Pixel: Meu Pixel • Canal: VIP Premium              │     │
│  │ Link: trackgram.com/t/black-friday      [Copiar]  │     │
│  │ 📈 Views: 234 • Clicks: 180 • Entradas: 89        │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ 📊 Lançamento Curso                               │     │
│  │ Pixel: Pixel Edu • Canal: Comunidade              │     │
│  │ Link: trackgram.com/t/curso-xyz         [Copiar]  │     │
│  │ 📈 Views: 567 • Clicks: 423 • Entradas: 201       │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 12.2 Fluxo de Onboarding

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Signup  │───▶│  Pixel  │───▶│  Canal  │───▶│  Funil  │───▶│Dashboard│
│         │    │ Config  │    │ Config  │    │ Criação │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     │  Magic Link  │ Pixel ID +   │ Bot Token +  │ Nome +       │ Métricas
     │              │ Token CAPI   │ Validação    │ Pixel+Canal  │ em tempo
     │              │              │              │              │ real
```

---

## 13. Modelo de Negócio

### 13.1 Planos e Precificação

| Plano | Preço/mês | Domínios | Pixels | Canais | Funis | Target |
|-------|-----------|----------|--------|--------|-------|--------|
| **Starter** | R$ 5 | 5 | 5 | 2 | 10 | Iniciantes |
| **Pro Scale** | R$ 197 | 15 | 15 | 5 | ∞ | Profissionais |
| **Enterprise** | R$ 297 | ∞ | ∞ | ∞ | ∞ | Agências |

### 13.2 Estratégia de Monetização

1. **Freemium → Paid**: Trial de 7 dias no Starter
2. **Upsell**: Limites encorajam upgrade
3. **Annual Discount**: 20% off no plano anual
4. **Custom Enterprise**: Preço negociável para grandes contas

### 13.3 Projeção Financeira (12 meses)

| Mês | Usuários | MRR | Churn |
|-----|----------|-----|-------|
| M1 | 50 | R$ 5.000 | 10% |
| M3 | 200 | R$ 25.000 | 8% |
| M6 | 500 | R$ 65.000 | 6% |
| M12 | 2.000 | R$ 200.000 | 5% |

---

## 14. Roadmap

### 14.1 Fase 1 - MVP (Atual) ✅

- [x] Autenticação via Magic Link
- [x] CRUD de Pixels
- [x] CRUD de Canais/Bots
- [x] CRUD de Funis
- [x] Sistema de Rastreamento
- [x] Webhook Telegram
- [x] Facebook CAPI
- [x] Dashboard com Métricas
- [x] Planos de Assinatura

### 14.2 Fase 2 - Melhorias (Q1 2025)

- [ ] Domínios Personalizados
- [ ] UTMs Customizados
- [ ] Mensagens Automáticas pós-entrada
- [ ] Postbacks para Integrações (Zapier, Make)
- [ ] Relatórios Avançados (PDF/CSV)
- [ ] Filtros Avançados no Dashboard

### 14.3 Fase 3 - Scale (Q2 2025)

- [ ] API Pública para Desenvolvedores
- [ ] White Label para Agências
- [ ] Integração Google Ads
- [ ] Integração TikTok Ads
- [ ] Pixel de Retargeting próprio
- [ ] Multi-idioma (EN, ES)

### 14.4 Fase 4 - Enterprise (Q3-Q4 2025)

- [ ] App Mobile (iOS/Android)
- [ ] IA para Previsão de Conversões
- [ ] A/B Testing de Landing Pages
- [ ] Integrações CRM (HubSpot, Pipedrive)
- [ ] SSO Enterprise
- [ ] SLA e Suporte Dedicado

---

## 15. Riscos e Mitigações

### 15.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| API Telegram instável | Média | Alto | Retry logic + fallback para link estático |
| Rate limit Facebook CAPI | Baixa | Médio | Batch events + queue |
| Webhook timeout | Média | Alto | Processar async + logging |
| Supabase downtime | Baixa | Crítico | Monitoring + backups |

### 15.2 Riscos de Negócio

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Política Telegram mudar | Média | Alto | Diversificar para outros mensageiros |
| Política Facebook CAPI | Baixa | Alto | Manter conformidade + alternativas |
| Concorrência agressiva | Alta | Médio | Foco em UX e features únicas |
| Churn alto | Média | Alto | Onboarding + Success Team |

### 15.3 Riscos Legais/Compliance

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| LGPD | Alta | Alto | DPO + Termos claros + Consentimento |
| Termos do Telegram | Média | Alto | Revisão jurídica periódica |
| Termos do Facebook | Média | Alto | Conformidade CAPI documentada |

---

## 16. Glossário

| Termo | Definição |
|-------|-----------|
| **CAPI** | Conversions API - API server-side do Facebook para eventos |
| **EMQ** | Event Match Quality - Score de qualidade de correspondência |
| **fbc** | Facebook Click ID - Identificador do clique |
| **fbp** | Facebook Browser ID - Identificador do navegador |
| **fbclid** | Facebook Click ID na URL |
| **Funil** | Configuração que une Pixel + Canal + Link |
| **Pixel** | Identificador do Facebook para rastreamento |
| **RLS** | Row Level Security - Isolamento de dados por usuário |
| **Slug** | Identificador amigável na URL |
| **Visitor ID** | Identificador único do visitante no sistema |
| **Webhook** | Callback HTTP para notificações em tempo real |

---

## 📝 Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0.0 | 11/12/2024 | Equipe TrackGram | Documento inicial |

---

## ✅ Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Product Owner | - | - | Pendente |
| Tech Lead | - | - | Pendente |
| Stakeholder | - | - | Pendente |

---

**© 2024 TrackGram. Todos os direitos reservados.**

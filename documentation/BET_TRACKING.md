# 🎯 Bet Tracking - Guia de Implementação

## Visão Geral

Este sistema permite rastrear leads que passam pelo seu funil (Landing Page → Telegram → Bet) e enviar eventos para o Facebook CAPI quando eles fazem cadastro ou depósito na bet.

## Fluxo Completo

```
1. Anúncio Facebook → Landing Page (TrackGram captura vid, fbc, fbp)
2. Landing Page → /t/slug → Telegram
3. Canal do Telegram envia esse link unico → betia.io/codigo/ (Script betia-tracker.js)
4. betia.io → betlionpro.com (Script bet-tracker.js)
5. Bet → Webhook de Cadastro/Depósito → /api/bet/webhook
6. TrackGram faz match e dispara CAPI pro Facebook
```

---

## Arquivos Criados

| Arquivo                             | Descrição                                    |
| ----------------------------------- | -------------------------------------------- |
| `scripts/betia-tracker.js`          | Script para instalar em betia.io/codigo/     |
| `scripts/bet-tracker.js`            | Script para instalar na bet (betlionpro.com) |
| `src/app/api/bet/identify/route.ts` | API para identificar leads                   |
| `src/app/api/bet/webhook/route.ts`  | API para receber webhooks da bet             |
| Tabela `bet_leads` (Supabase)       | Armazena o match email ↔ visitor_id          |

---

## Passo a Passo de Instalação

### 1️⃣ Deploy do TrackGram

Faça deploy do projeto para que as novas rotas estejam disponíveis:

```bash
git add .
git commit -m "feat: add bet tracking system"
git push
```

Após o deploy, suas URLs serão:

- `https://SEU-DOMINIO.vercel.app/api/bet/identify`
- `https://SEU-DOMINIO.vercel.app/api/bet/webhook`

---

### 2️⃣ Instalar Script em betia.io/codigo/

1. Abra o arquivo `scripts/betia-tracker.js`
2. Copie o conteúdo
3. Cole no `<head>` ou antes do `</body>` da página betia.io/codigo/

**O que esse script faz:**

- Lê os parâmetros de tracking do localStorage (que vieram da landing page)
- Decora automaticamente o botão "ACESSAR BETLIONPRO" com esses parâmetros

---

### 3️⃣ Instalar Script na Bet (betlionpro.com)

1. Abra o arquivo `scripts/bet-tracker.js`
2. **IMPORTANTE:** Altere a linha:

   ```javascript
   const TRACKING_API = "https://SEU-DOMINIO.vercel.app/api/bet/identify";
   ```

   Para sua URL real (ex: `https://trackgram.vercel.app/api/bet/identify`)

3. Copie o conteúdo
4. No painel da bet, vá em configurações de código personalizado
5. Cole no campo `<head>`
6. Salve

**O que esse script faz:**

- Lê vid/fbc/fbp da URL quando o usuário entra na bet
- Salva no localStorage do domínio da bet
- Quando o usuário clica em "Criar conta", envia email + dados de tracking para seu servidor

---

### 4️⃣ Configurar Webhook da Bet no N8N

Altere o webhook de cadastro e depósito no seu N8N para também enviar para o TrackGram:

**Webhook de Cadastro:**

```
URL: https://SEU-DOMINIO.vercel.app/api/bet/webhook
Método: POST
Content-Type: application/json
Body: { "email": "{{email}}", "phone": "{{phone}}" }
```

**Webhook de Depósito:**

```
URL: https://SEU-DOMINIO.vercel.app/api/bet/webhook
Método: POST
Content-Type: application/json
Body: {
  "email": "{{email}}",
  "phone": "{{phone}}",
  "valor": {{valor}},
  "status": "PAID",
  "currency": "BRL"
}
```

---

## Verificação

### Verificar se tabela foi criada:

```sql
SELECT * FROM bet_leads LIMIT 5;
```

### Testar endpoint de identificação:

```bash
curl -X POST https://SEU-DOMINIO.vercel.app/api/bet/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","visitor_id":"abc123","fbc":"fb.1.xxx"}'
```

### Testar endpoint de webhook:

```bash
curl -X POST https://SEU-DOMINIO.vercel.app/api/bet/webhook \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","phone":"11999999999"}'
```

---

## Fluxo de Dados

```
┌─────────────────┐
│  Landing Page   │
│  (TrackGram)    │
│                 │
│ Salva no        │
│ localStorage:   │
│ - visitor_id    │
│ - fbc           │
│ - fbp           │
│ - utms          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  betia.io/      │
│  codigo/        │
│                 │
│ Lê localStorage │
│ Decora link →   │
│ bet?vid=x&fbc=y │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  betlionpro     │
│  .com           │
│                 │
│ Lê da URL       │
│ Salva local     │
│ No cadastro →   │
│ POST /identify  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  bet_leads      │     │  Webhook da     │
│  (Supabase)     │◄────│  Bet (N8N)      │
│                 │     │                 │
│ email           │     │ POST /webhook   │
│ visitor_id      │     │ {email, valor}  │
│ fbc             │     │                 │
│ fbp             │     └─────────────────┘
│ status          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Facebook       │
│  CAPI           │
│                 │
│ Lead ou         │
│ Purchase event  │
└─────────────────┘
```

---

## Troubleshooting

### Lead não está sendo identificado

1. Verifique se o script da betia.io está decorando os links (F12 → Console)
2. Verifique se a URL da bet tem os parâmetros vid, fbc, fbp
3. Verifique se o script da bet está capturando (F12 → Console)

### Evento CAPI não está sendo enviado

1. Verifique se existe um pixel configurado na tabela `pixels`
2. Verifique se o lead tem `fbc` preenchido (sem fbc, não envia)
3. Verifique os logs do Vercel

### Webhook da bet não está chegando

1. Teste o endpoint manualmente com curl
2. Verifique a configuração do N8N
3. Verifique os logs do Vercel

---

## Métricas

Você pode verificar quantos leads foram rastreados:

```sql
-- Total de leads identificados
SELECT COUNT(*) FROM bet_leads WHERE visitor_id IS NOT NULL;

-- Leads que fizeram depósito
SELECT COUNT(*) FROM bet_leads WHERE status = 'deposited';

-- Taxa de conversão (com tracking)
SELECT
  COUNT(*) FILTER (WHERE visitor_id IS NOT NULL) as com_tracking,
  COUNT(*) FILTER (WHERE visitor_id IS NULL) as sem_tracking,
  ROUND(100.0 * COUNT(*) FILTER (WHERE visitor_id IS NOT NULL) / COUNT(*), 2) as taxa_tracking
FROM bet_leads;
```

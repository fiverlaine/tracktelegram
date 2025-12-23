# TrackGram - Guia de Implementação Prática

## 🚀 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     TELEGRAM BOT (seu_bot)                      │
└────────────────────────────┬────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌────────────┐  ┌──────────────┐  ┌───────────────┐
    │  Webhooks  │  │  Commands    │  │  Inline Keys  │
    │  Updates   │  │  (/start)    │  │  (Callbacks)  │
    └─────┬──────┘  └──────┬───────┘  └───────┬───────┘
          │                │                 │
          └────────────────┼─────────────────┘
                          │
                    ┌─────▼──────┐
                    │   Node.js   │
                    │   Handler   │
                    └─────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐  ┌──────────────┐  ┌────────────────┐
    │ Database │  │ Your Server  │  │ Facebook CAPI  │
    │(Postgres)│  │   Events     │  │   Conversions  │
    └──────────┘  └──────────────┘  └────────────────┘
```

---

## 🔧 SETUP INICIAL

### 1. Criar Bot no BotFather

```
1. Abrir Telegram
2. Procurar @BotFather
3. /newbot
4. Nome: TrackGram
5. Username: trackgrambot (exemplo)
6. Copiar TOKEN: 123456:ABC-DEF1234...
7. /setdomain → seu-site.com
8. /setdescription → Rastreador de visitantes
```

### 2. Variáveis de Ambiente
```bash
# .env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234...
TELEGRAM_WEBHOOK_URL=https://seu-site.com/webhook
TELEGRAM_SECRET_TOKEN=seu-token-secreto-aleatorio
DATABASE_URL=postgres://user:pass@localhost/trackgram
FACEBOOK_CAPI_TOKEN=seu-facebook-token
FACEBOOK_PIXEL_ID=seu-pixel-id
```

---

## 📡 WEBHOOK SETUP (Node.js + Express)

### Configurar Webhook no Telegram
```javascript
// setup-webhook.js
const fetch = require('node-fetch');

async function setupWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: process.env.TELEGRAM_WEBHOOK_URL,
      allowed_updates: [
        'message',
        'chat_member',
        'chat_join_request',
        'callback_query'
      ],
      max_connections: 100,
      secret_token: process.env.TELEGRAM_SECRET_TOKEN
    })
  });
  
  const data = await response.json();
  console.log('Webhook setup:', data);
}

setupWebhook();
```

### Express Webhook Handler
```javascript
// webhook-handler.js
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Middleware: Validar Secret Token
app.use((req, res, next) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  
  if (secretToken !== process.env.TELEGRAM_SECRET_TOKEN) {
    return res.status(401).send('Unauthorized');
  }
  
  next();
});

// Webhook Endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    console.log(`[UPDATE] ID: ${update.update_id}`);
    
    // IMPORTANTE: Responder 200 OK IMEDIATAMENTE
    res.status(200).send('OK');
    
    // Processar update de forma assíncrona (não bloquear response)
    handleUpdate(update).catch(err => {
      console.error('Error handling update:', err);
      // Log em serviço de error tracking (Sentry, etc)
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Mesmo assim retornar 200 para Telegram não retentar
  }
});

async function handleUpdate(update) {
  // Prosseguir com o processamento...
}

app.listen(3000, () => {
  console.log('Webhook listening on port 3000');
});
```

---

## 👤 CRIAR LINK ÚNICO POR VISITANTE

### Função para Gerar Link
```javascript
// generate-invite-link.js
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

async function createVisitorInviteLink(visitorData) {
  const {
    visitor_id,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_content,
    fbc,  // Facebook Click ID
    fbp   // Facebook Pixel ID
  } = visitorData;
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID; // ID do seu supergrupo
  
  // Nome do link único
  const linkName = `v${visitor_id.substring(0, 10)}`;
  
  // URL de criação
  const url = `https://api.telegram.org/bot${token}/createChatInviteLink`;
  
  const body = {
    chat_id: chatId,
    name: linkName,
    expires_date: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 dias
    member_limit: 1,  // ⭐ Limitar a 1 user por link
    creates_join_request: true  // ⭐ Requer aprovação
  };
  
  console.log(`[CREATE_LINK] Visitante: ${visitor_id}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  
  const inviteLink = data.result.invite_link;
  
  // ✅ Armazenar no banco
  await db.query(
    `INSERT INTO visitor_links 
    (visitor_id, invite_link, utm_source, utm_campaign, utm_medium, utm_content, fbc, fbp, created_at, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '7 days')`,
    [visitor_id, inviteLink, utm_source, utm_campaign, utm_medium, utm_content, fbc, fbp]
  );
  
  return {
    visitor_id,
    invite_link: inviteLink,
    expires_in_days: 7
  };
}

module.exports = { createVisitorInviteLink };
```

### Schema do Banco
```sql
-- visitor_links.sql
CREATE TABLE visitor_links (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(255) UNIQUE NOT NULL,
  invite_link VARCHAR(500) NOT NULL,
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(100),
  fbc VARCHAR(500),  -- Facebook Click ID
  fbp VARCHAR(500),  -- Facebook Pixel ID
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  telegram_user_id BIGINT,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, used, expired, rejected
  created_index BIGINT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM created_at)::BIGINT
  ) STORED
);

CREATE INDEX idx_visitor_links_visitor_id ON visitor_links(visitor_id);
CREATE INDEX idx_visitor_links_invite_link ON visitor_links(invite_link);
CREATE INDEX idx_visitor_links_telegram_user_id ON visitor_links(telegram_user_id);
CREATE INDEX idx_visitor_links_created ON visitor_links(created_at);
```

---

## 🔔 PROCESSAR CHAT_JOIN_REQUEST

### Handler para Join Requests
```javascript
// handlers/join-request.js
const fetch = require('node-fetch');
const { sendFacebookCAPI } = require('../facebook-capi');

async function handleChatJoinRequest(update) {
  const chatJoinRequest = update.chat_join_request;
  const userId = chatJoinRequest.from.id;
  const chatId = chatJoinRequest.chat.id;
  const inviteLink = chatJoinRequest.invite_link?.invite_link;
  
  console.log(`[JOIN_REQUEST] User: ${userId}, Link: ${inviteLink}`);
  
  // 1️⃣ Encontrar visitor_id pelo invite_link
  const visitorResult = await db.query(
    `SELECT * FROM visitor_links 
     WHERE invite_link = $1 AND status = 'pending'`,
    [inviteLink]
  );
  
  if (visitorResult.rows.length === 0) {
    console.warn(`[JOIN_REQUEST] Link não encontrado no banco: ${inviteLink}`);
    // ❌ Rejeitar se não encontrar referência
    await declineChatJoinRequest(userId, chatId);
    return;
  }
  
  const visitorLink = visitorResult.rows[0];
  const visitorId = visitorLink.visitor_id;
  
  // 2️⃣ Atualizar no banco
  await db.query(
    `UPDATE visitor_links 
     SET telegram_user_id = $1, used_at = NOW(), status = 'used'
     WHERE id = $2`,
    [userId, visitorLink.id]
  );
  
  // 3️⃣ APROVAR a solicitação
  const approved = await approveChatJoinRequest(userId, chatId);
  
  if (approved) {
    console.log(`[JOIN_REQUEST] APPROVED User: ${userId}`);
    
    // 4️⃣ Preparar dados para Facebook CAPI
    const facebookData = {
      visitor_id: visitorId,
      telegram_user_id: userId,
      user_data: {
        em: hashEmail(chatJoinRequest.from.username),  // Username como proxy de email
        fn: chatJoinRequest.from.first_name,
        ln: chatJoinRequest.from.last_name || '',
        ph: null  // Telegram não fornece phone
      },
      event: 'Group_Join_Approved',
      event_id: `trackgram_${userId}_${Date.now()}`,
      fbc: visitorLink.fbc,  // Facebook Click ID
      fbp: visitorLink.fbp,   // Facebook Pixel ID
      utm_source: visitorLink.utm_source,
      utm_campaign: visitorLink.utm_campaign,
      utm_medium: visitorLink.utm_medium,
      utm_content: visitorLink.utm_content
    };
    
    // 5️⃣ Enviar para Facebook CAPI
    try {
      await sendFacebookCAPI(facebookData);
      console.log(`[FACEBOOK_CAPI] Conversão registrada: ${visitorId}`);
    } catch (error) {
      console.error(`[FACEBOOK_CAPI] Erro ao enviar:`, error);
      // Log mas não falhar - conversão já foi contabilizada no Telegram
    }
    
    // 6️⃣ Enviar mensagem de boas-vindas
    await sendWelcomeMessage(userId, chatJoinRequest.from.first_name);
    
  } else {
    console.error(`[JOIN_REQUEST] FAILED to approve user: ${userId}`);
  }
}

async function approveChatJoinRequest(userId, chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/approveChatJoinRequest`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId
    })
  });
  
  const data = await response.json();
  return data.ok;
}

async function declineChatJoinRequest(userId, chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/declineChatJoinRequest`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId
    })
  });
  
  const data = await response.json();
  return data.ok;
}

module.exports = { handleChatJoinRequest };
```

---

## 💌 ENVIAR MENSAGEM DE BOAS-VINDAS

### Handler para Welcome Message
```javascript
// handlers/welcome-message.js
const fetch = require('node-fetch');

async function sendWelcomeMessage(userId, firstName) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  // Preparar mensagem com formatação MarkdownV2
  const messageText = `
Bem\-vindo ao grupo, *${escapeMarkdownV2(firstName)}*\\!

Aqui você encontrará:
• Atualizações exclusivas
• Suporte direto
• Ofertas especiais

Clique no botão abaixo para acessar seu dashboard:
`.trim();
  
  const payload = {
    chat_id: userId,  // Enviar em DM
    text: messageText,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📊 Meu Dashboard',
            url: `https://seu-site.com/dashboard?user_id=${userId}`
          }
        ],
        [
          {
            text: '❓ Precisa de Ajuda?',
            callback_data: 'help_menu'
          },
          {
            text: '⚙️ Configurações',
            callback_data: 'settings_menu'
          }
        ]
      ]
    }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    console.error(`[WELCOME_MSG] Erro ao enviar: ${data.description}`);
    // Alguns usuários têm bloqueios de bots em DM
    // Isso é esperado e ok
  } else {
    console.log(`[WELCOME_MSG] Enviada para user: ${userId}`);
  }
}

function escapeMarkdownV2(text) {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escaped = text;
  specialChars.forEach(char => {
    escaped = escaped.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
  });
  return escaped;
}

module.exports = { sendWelcomeMessage };
```

---

## 📱 PROCESSAR CHAT_MEMBER UPDATE (Saída de Membros)

### Handler para Saídas
```javascript
// handlers/chat-member.js

async function handleChatMember(update) {
  const chatMember = update.chat_member;
  const userId = chatMember.from.id;
  const chatId = chatMember.chat.id;
  const newStatus = chatMember.new_chat_member.status;
  const oldStatus = chatMember.old_chat_member.status;
  
  console.log(`[CHAT_MEMBER] User: ${userId}, Old: ${oldStatus}, New: ${newStatus}`);
  
  // ⭐ Rastrear saídas
  if (newStatus === 'left' || newStatus === 'kicked') {
    await db.query(
      `INSERT INTO member_events 
       (telegram_user_id, event_type, old_status, new_status, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, 'left_or_kicked', oldStatus, newStatus]
    );
    
    console.log(`[CHAT_MEMBER] ${newStatus === 'kicked' ? 'KICKED' : 'LEFT'} User: ${userId}`);
  }
}

module.exports = { handleChatMember };
```

---

## 📊 INTEGRAÇÃO COM FACEBOOK CAPI

### Enviar Conversão
```javascript
// facebook-capi.js
const crypto = require('crypto');
const fetch = require('node-fetch');

function hashData(data) {
  if (!data) return null;
  return crypto.createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex');
}

async function sendFacebookCAPI(eventData) {
  const pixelId = process.env.FACEBOOK_PIXEL_ID;
  const token = process.env.FACEBOOK_CAPI_TOKEN;
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${token}`;
  
  const payload = {
    data: [
      {
        event_name: 'Lead',  // ou Purchase, Subscribe, ViewContent, etc
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventData.event_id,
        event_source_url: `https://seu-site.com/visitor/${eventData.visitor_id}`,
        user_data: {
          em: eventData.user_data.em ? [hashData(eventData.user_data.em)] : [],
          fn: eventData.user_data.fn ? [hashData(eventData.user_data.fn)] : [],
          ln: eventData.user_data.ln ? [hashData(eventData.user_data.ln)] : [],
          // Campos opcionais
          external_id: eventData.telegram_user_id.toString(),
          fbc: eventData.fbc,  // Facebook Click ID
          fbp: eventData.fbp,  // Facebook Browser ID
        },
        custom_data: {
          value: 1.0,
          currency: 'BRL',
          // Metadados customizados
          utm_source: eventData.utm_source,
          utm_campaign: eventData.utm_campaign,
          utm_medium: eventData.utm_medium,
          visitor_id: eventData.visitor_id
        }
      }
    ],
    test_event_code: process.env.FACEBOOK_TEST_EVENT_CODE // Para testar
  };
  
  console.log('[FACEBOOK_CAPI] Enviando evento:', JSON.stringify(payload, null, 2));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (result.events_received) {
    console.log(`[FACEBOOK_CAPI] ✅ Evento aceito. Events received: ${result.events_received}`);
    return true;
  } else {
    console.error('[FACEBOOK_CAPI] ❌ Erro:', result);
    throw new Error(`Facebook CAPI error: ${result.error?.message}`);
  }
}

module.exports = { sendFacebookCAPI };
```

---

## 🎯 PROCESSAR CALLBACK QUERY (Botões)

### Handler para Callbacks
```javascript
// handlers/callback-query.js
const fetch = require('node-fetch');

async function handleCallbackQuery(update) {
  const callbackQuery = update.callback_query;
  const userId = callbackQuery.from.id;
  const queryId = callbackQuery.id;
  const data = callbackQuery.data;
  
  console.log(`[CALLBACK] User: ${userId}, Data: ${data}`);
  
  // ✅ Responder imediatamente (remove hourglass)
  await answerCallbackQuery(queryId, 'Processando...');
  
  // Processar ação
  if (data === 'help_menu') {
    await sendHelpMenu(userId);
  } else if (data === 'settings_menu') {
    await sendSettingsMenu(userId);
  } else if (data.startsWith('set_opt_')) {
    const option = data.replace('set_opt_', '');
    await saveUserPreference(userId, option);
  }
}

async function answerCallbackQuery(queryId, text, showAlert = false) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: queryId,
      text: text,
      show_alert: showAlert  // true = popup, false = toast notification
    })
  });
  
  return response.json();
}

async function sendHelpMenu(userId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: userId,
      text: `
*Precisa de Ajuda\\?*

📌 *FAQ:*
• [Como funciona\\?](https://seu-site.com/faq)
• [Como rastrear conversões\\?](https://seu-site.com/faq/tracking)
• [Suporte\\?](https://seu-site.com/support)
      `.trim(),
      parse_mode: 'MarkdownV2'
    })
  });
  
  return response.json();
}

module.exports = { handleCallbackQuery };
```

---

## 🚀 ORQUESTRADOR DE UPDATES

### Main Handler
```javascript
// update-orchestrator.js
const { handleChatJoinRequest } = require('./handlers/join-request');
const { handleChatMember } = require('./handlers/chat-member');
const { handleCallbackQuery } = require('./handlers/callback-query');
const { handleMessage } = require('./handlers/message');

async function handleUpdate(update) {
  try {
    // Qual tipo de update?
    if (update.chat_join_request) {
      await handleChatJoinRequest(update);
    } 
    else if (update.chat_member) {
      await handleChatMember(update);
    } 
    else if (update.callback_query) {
      await handleCallbackQuery(update);
    } 
    else if (update.message) {
      await handleMessage(update);
    }
    
  } catch (error) {
    console.error('[ORCHESTRATOR] Error:', error);
    // Reportar para Sentry/LogRocket/etc
    reportError(error, update);
  }
}

function reportError(error, update) {
  // Implementar seu error tracking
  console.error({
    error: error.message,
    stack: error.stack,
    update_id: update.update_id,
    timestamp: new Date().toISOString()
  });
}

module.exports = { handleUpdate };
```

---

## 📈 QUERY ÚTEIS PARA ANALYTICS

### Dashboard Metrics
```sql
-- Visitantes que completaram cada etapa
SELECT 
  'Total Visitantes' as stage,
  COUNT(DISTINCT visitor_id) as count
FROM visitor_links

UNION ALL

SELECT 
  'Solicitações de Entrada',
  COUNT(DISTINCT telegram_user_id)
FROM visitor_links
WHERE status = 'used'

UNION ALL

SELECT 
  'Membros Ativos',
  COUNT(DISTINCT telegram_user_id)
FROM member_events
WHERE event_type NOT IN ('left_or_kicked')
  AND timestamp > NOW() - INTERVAL '30 days';

-- Taxa de conversão
SELECT 
  utm_source,
  COUNT(*) as total_visitors,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as conversions,
  ROUND(100.0 * COUNT(CASE WHEN status = 'used' THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM visitor_links
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY utm_source
ORDER BY conversion_rate DESC;

-- Engagement por visitante
SELECT 
  v.visitor_id,
  COUNT(m.id) as messages_sent,
  MAX(m.created_at) as last_activity
FROM visitor_links v
LEFT JOIN member_events m ON v.telegram_user_id = m.telegram_user_id
WHERE v.status = 'used'
GROUP BY v.visitor_id
ORDER BY messages_sent DESC;
```

---

## 🔒 CHECKLIST DE SEGURANÇA

- [ ] Validar secret_token em todas as requisições
- [ ] Usar HTTPS para webhook
- [ ] Validar update_id para evitar duplicatas
- [ ] Hash de emails/dados sensíveis antes de Facebook CAPI
- [ ] Rate limiting no endpoint de webhook
- [ ] Logs auditáveis de todas as ações
- [ ] Respeitar LGPD - permitir delete de dados do usuário
- [ ] Renovar tokens periodicamente
- [ ] Usar environment variables, nunca hardcode secrets
- [ ] Backup automático do banco

---

## 📊 PRÓXIMOS PASSOS

1. **Implementar retentativas**: Redis queue para mensagens que falham
2. **Analytics real-time**: WebSocket para dashboard ao vivo
3. **A/B Testing**: Testar diferentes mensagens/ofertas
4. **Automação**: Cron jobs para limpeza de dados antigos
5. **Segurança**: Rate limiting, CAPTCHA para criar links
6. **Escalabilidade**: Múltiplos processos worker para alta carga

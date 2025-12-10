# 🚀 TrackGram - Sistema de Rastreamento para Telegram

![TrackGram](https://img.shields.io/badge/TrackGram-v0.1.0-purple)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-black)

Sistema de rastreamento que resolve a **cegueira de dados em anúncios para Telegram**. Rastreia cliques em anúncios e cruza esses dados com a entrada real do usuário em grupos/canais do Telegram, enviando eventos via API de Conversão (CAPI) para o Facebook Ads.

## ✨ Funcionalidades

- 📊 **Dashboard Completo**: Métricas em tempo real de pageviews, clicks, entradas e saídas
- 🔗 **Links de Rastreamento**: Crie links únicos para suas campanhas
- 📱 **Integração Telegram**: Conexão direta com canais/grupos via Bot
- 📈 **Facebook CAPI**: Envio server-side de eventos para melhor atribuição
- 🎯 **Links Dinâmicos**: Cada visitante recebe um link de convite único
- 🔒 **Autenticação**: Login seguro via Magic Link

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Auth)
- **APIs**: Telegram Bot API, Facebook Conversions API
- **Deploy**: Vercel

## 📦 Instalação Local

```bash
# Clone o repositório
git clone https://github.com/fiverlaine/tracktelegram.git
cd tracktelegram

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite o .env.local com suas credenciais

# Execute em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## 🚀 Deploy na Vercel

### Passo 1: Fork/Clone do Repositório

```bash
git clone https://github.com/fiverlaine/tracktelegram.git
```

### Passo 2: Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"New Project"**
3. Importe o repositório `tracktelegram`
4. Configure as **Environment Variables**:

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase (API Routes) |
| `NEXT_PUBLIC_APP_URL` | URL da sua aplicação na Vercel |

5. Clique em **"Deploy"**

### Passo 3: Configurar Supabase

1. No [Supabase Dashboard](https://supabase.com/dashboard), vá em **Authentication > URL Configuration**
2. Adicione sua URL da Vercel em **Site URL** e **Redirect URLs**:
   - `https://seu-projeto.vercel.app`
   - `https://seu-projeto.vercel.app/auth/callback`

## ⚙️ Configuração

### Configurar Bot do Telegram

1. Crie um bot com o [@BotFather](https://t.me/BotFather)
2. Anote o token e username do bot
3. Crie um canal/grupo no Telegram
4. Adicione o bot como **administrador** do canal
5. Configure o bot no TrackGram (página Canais)
6. Clique em **"Ativar Rastreamento"**

### Configurar Pixel do Facebook

1. Crie um Pixel no [Facebook Business Manager](https://business.facebook.com)
2. Gere um **Access Token** para a API de Conversões
3. Adicione no TrackGram (página Pixels)

### Criar Funil de Rastreamento

1. Vá em **Funis** no dashboard
2. Clique em **"Novo Funil"**
3. Selecione o Pixel e o Canal
4. Copie o link gerado e use nos seus anúncios!

## 📐 Arquitetura

```
Fluxo de Rastreamento:

1. Facebook Ads → seusite.com/t/{slug}?fbclid=xyz
2. Página captura: fbclid, fbc, fbp, User-Agent
3. API gera INVITE LINK ÚNICO com visitor_id
4. Usuário é redirecionado DIRETO para t.me/+XXXXX
5. Webhook detecta entrada + extrai visitor_id
6. ENVIA para Facebook CAPI como "Lead"
```

## 📁 Estrutura do Projeto

```
track-gram/
├── src/
│   ├── app/
│   │   ├── (dashboard)/     # Páginas do dashboard
│   │   │   ├── channels/    # Gerenciar bots
│   │   │   ├── pixels/      # Gerenciar pixels
│   │   │   ├── funnels/     # Funis de rastreamento
│   │   │   └── domains/     # Domínios personalizados
│   │   ├── api/             # API Routes
│   │   │   ├── invite/      # Gerar links de convite
│   │   │   └── webhook/     # Webhooks do Telegram
│   │   ├── auth/            # Autenticação
│   │   ├── login/           # Página de login
│   │   └── t/[slug]/        # Página de tracking
│   ├── components/          # Componentes React
│   └── lib/                 # Utilitários e clientes
├── documentation/           # Documentação do sistema
├── vercel.json             # Configuração Vercel
└── package.json
```

## 🔒 Variáveis de Ambiente

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Chave de serviço (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Public | URL da aplicação em produção |

## 📖 Documentação

Consulte a documentação completa em [`documentation/SISTEMA.md`](./documentation/SISTEMA.md)

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e de uso exclusivo.

---

**Desenvolvido com 💜 por [Fiverlaine](https://github.com/fiverlaine)**

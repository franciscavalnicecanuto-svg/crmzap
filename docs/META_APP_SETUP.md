# Meta App Setup Guide

## Required Products

Para que o CRMZap funcione com Facebook Messenger e Instagram DMs, o Meta App precisa ter os seguintes produtos habilitados:

### 1. Messenger (Obrigatório para Facebook)

1. Acesse: https://developers.facebook.com/apps/817909754597233/
2. No menu lateral, clique em **"Adicionar um produto"** (ou "Add a Product")
3. Encontre **"Messenger"** e clique em **"Configurar"**
4. Isso habilita os scopes:
   - `pages_messaging` - enviar/receber mensagens
   - `pages_manage_metadata` - gerenciar configurações da página

### 2. Instagram Graph API (Obrigatório para Instagram)

1. No mesmo menu, clique em **"Adicionar um produto"**
2. Encontre **"Instagram Graph API"** ou **"Instagram"**
3. Clique em **"Configurar"**
4. Isso habilita os scopes:
   - `instagram_basic` - acesso básico ao Instagram
   - `instagram_manage_messages` - gerenciar DMs

## Configuração do App

### Basic Settings
- **App ID:** 817909754597233
- **Display Name:** CRMZap (ou nome desejado)
- **App Mode:** Development (para testes)

### Valid OAuth Redirect URIs
```
https://whatszap-zeta.vercel.app/api/auth/meta/callback
```

### Permissions to Request
Após habilitar os produtos, vá em **"App Review" → "Permissions and Features"** e solicite:

**Para Messenger:**
- `pages_messaging`
- `pages_manage_metadata`
- `pages_read_engagement`
- `pages_show_list`

**Para Instagram:**
- `instagram_basic`
- `instagram_manage_messages`

## Development Mode

Em modo de desenvolvimento, apenas usuários com role no app (Admin, Developer, Tester) podem usar. Para adicionar testers:

1. Vá em **"Roles" → "Roles"**
2. Clique em **"Add People"**
3. Adicione o ID ou email do Facebook do tester

## Webhooks (Para receber mensagens)

Após conectar uma página, configure webhooks:

1. No produto **Messenger**, vá em **"Webhooks"**
2. Callback URL: `https://whatszap-zeta.vercel.app/api/webhooks/meta`
3. Verify Token: (configurar no Chatwoot)
4. Selecione os eventos: `messages`, `messaging_postbacks`

## Troubleshooting

### "Invalid Scopes" Error
- Verifique se os produtos estão habilitados
- Em dev mode, só funciona para usuários com role no app
- Scopes não habilitados são ignorados silenciosamente

### "App Not Setup" Error
- Complete as configurações básicas do app
- Adicione pelo menos um produto

### Não consegue ver a página
- O usuário precisa ser admin da página
- O usuário precisa ter role no app (em dev mode)

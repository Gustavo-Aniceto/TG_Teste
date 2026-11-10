# G&O Restaurante — Cardápio Digital

Trabalho de graduação (Fatec Guarulhos) de Gustavo Aniceto e Otavio Barreiro.

O projeto tem duas versões do cardápio:

| Pasta         | Uso                                   | Dados pedidos ao cliente         |
|---------------|---------------------------------------|----------------------------------|
| `online/`     | Delivery (pedido para entrega)        | CEP (busca automática ViaCEP), endereço |
| `presencial/` | Pedido na mesa (QR Code na mesa)      | Número da mesa e nome            |

Fluxo do pedido: **cardápio → carrinho (etapa 1) → endereço/mesa (etapa 2) → resumo (etapa 3)**.
No resumo o cliente escolhe:

- **Pagar com Mercado Pago** (cartão, Pix, boleto…) — via Checkout Pro; depois de pago, o
  pedido é enviado ao WhatsApp do restaurante já com o número do pagamento.
- **Pedir pelo WhatsApp** — paga na entrega / no caixa (como funcionava antes).

A versão delivery também tem o formulário de **reserva**, enviado pelo WhatsApp.

## Como rodar

Requer **Node.js 18+**.

```bash
npm install
cp .env.example .env   # e preencha MP_ACCESS_TOKEN
npm start
```

- Delivery: http://localhost:3000/online/
- Presencial: http://localhost:3000/presencial/

> Abrir o `index.html` direto (sem `npm start`) continua funcionando, mas sem o botão do
> Mercado Pago — o pagamento precisa do servidor, porque o Access Token é secreto e
> não pode ficar no navegador.

## Configurando o Mercado Pago

1. Acesse <https://www.mercadopago.com.br/developers/panel/app> e crie uma aplicação
   (produto: **Checkout Pro**).
2. Em **Credenciais de teste**, copie o *Access Token* (`TEST-...` ou `APP_USR-...` de conta de teste)
   para `MP_ACCESS_TOKEN` no `.env` e deixe `MP_SANDBOX=true`.
3. Para testar, crie **usuários de teste** (comprador) no painel e use os
   [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards)
   (ex.: titular `APRO` para aprovar, `OTHE` para recusar).
4. Em produção: troque pelo Access Token de produção, `MP_SANDBOX=false` e defina
   `PUBLIC_URL` com o endereço **https** do site. Com https o Mercado Pago volta
   automaticamente para o site após o pagamento e envia as notificações (webhook) para
   `PUBLIC_URL/api/pagamento/webhook`. Configure a assinatura secreta do webhook em
   `MP_WEBHOOK_SECRET`.

Variáveis (`.env`):

| Variável            | Descrição |
|---------------------|-----------|
| `MP_ACCESS_TOKEN`   | Access Token do Mercado Pago (sem ele o botão de pagamento fica oculto) |
| `MP_SANDBOX`        | `true` usa o checkout de testes |
| `MP_WEBHOOK_SECRET` | Assinatura secreta dos webhooks (opcional, recomendado) |
| `PUBLIC_URL`        | URL pública do site, sem barra no final |
| `PORT`              | Porta do servidor (padrão 3000) |
| `VALOR_ENTREGA`     | Taxa de entrega do delivery em reais (padrão 0) |

## Como o pagamento funciona

```
Navegador                      Servidor (Node/Express)               Mercado Pago
   | POST /api/pagamento/preferencia  |                                     |
   |  { modo, carrinho:[{id,qntd}],   |  busca preços em js/dados.js        |
   |    entrega }                     |  cria preferência ----------------> |
   | <-------------- { url } -------- |                                     |
   | redireciona para o checkout ---------------------------------------->  |
   | <------- volta: ?pagamento=sucesso&payment_id=123 -------------------- |
   | GET /api/pagamento/status/123 -> |  consulta o pagamento ------------> |
   | <------ { status: approved } --- |                                     |
   | mostra confirmação + botão WhatsApp com o comprovante                  |
```

- O preço **sempre** é calculado no servidor a partir de `js/dados.js`; o navegador só
  envia ids e quantidades.
- O carrinho fica salvo no `localStorage`, então o cliente não perde o pedido ao recarregar
  a página ou se o pagamento for recusado.

Arquivos principais:

- `server/index.js` — inicia o servidor e o SDK do Mercado Pago
- `server/app.js` — rotas (`/api/config`, `/api/pagamento/*`) e arquivos estáticos
- `server/pagamento.js` — validação do carrinho e montagem da preferência
- `online|presencial/js/mercadopago.js` — botão de pagamento e tratamento do retorno
- `online|presencial/js/app.js` — cardápio, carrinho e etapas do pedido
- `online|presencial/js/dados.js` — itens do cardápio (o mesmo arquivo nas duas versões)

## Testes

```bash
npm test
```

## Personalização

- Telefone do WhatsApp do restaurante: `CELULAR_EMPRESA` em `js/app.js`.
- Itens do cardápio: `js/dados.js` (mantenha o mesmo conteúdo nas duas pastas e use
  `id` únicos).

require('dotenv').config();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { criarApp } = require('./app');

const PORTA = Number(process.env.PORT) || 3000;
const URL_BASE = (process.env.PUBLIC_URL || `http://localhost:${PORTA}`).replace(/\/+$/, '');
const TOKEN = process.env.MP_ACCESS_TOKEN;

let preferenceClient;
let paymentClient;

if (TOKEN) {
    const config = new MercadoPagoConfig({ accessToken: TOKEN, options: { timeout: 10000 } });
    preferenceClient = new Preference(config);
    paymentClient = new Payment(config);
} else {
    console.warn('⚠️  MP_ACCESS_TOKEN não definido: o botão do Mercado Pago ficará desativado.');
}

const app = criarApp({
    preferenceClient,
    paymentClient,
    urlBase: URL_BASE,
    valorEntrega: Number(process.env.VALOR_ENTREGA || 0),
    webhookSecret: process.env.MP_WEBHOOK_SECRET,
    sandbox: process.env.MP_SANDBOX === 'true'
});

app.listen(PORTA, () => {
    console.log(`G&O Restaurante rodando em ${URL_BASE}`);
    console.log(`  Delivery:   ${URL_BASE}/online/`);
    console.log(`  Presencial: ${URL_BASE}/presencial/`);
});

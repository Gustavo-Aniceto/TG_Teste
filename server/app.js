const express = require('express');
const crypto = require('crypto');
const path = require('path');

const { carregarMenu, indexarPorId } = require('./cardapio');
const {
    ErroPedido, validarCarrinho, calcularTotal, gerarReferencia, montarPreferencia
} = require('./pagamento');

const MODOS = ['online', 'presencial'];

// Valida a assinatura (x-signature) das notificações do Mercado Pago.
// https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
function assinaturaValida(req, segredo) {
    const assinatura = req.get('x-signature') || '';
    const requestId = req.get('x-request-id') || '';
    const partes = Object.fromEntries(
        assinatura.split(',').map((p) => p.split('=').map((s) => s.trim()))
    );
    if (!partes.ts || !partes.v1) return false;

    const dataId = String(req.query['data.id'] || (req.body && req.body.data && req.body.data.id) || '').toLowerCase();
    let manifesto = '';
    if (dataId) manifesto += `id:${dataId};`;
    if (requestId) manifesto += `request-id:${requestId};`;
    manifesto += `ts:${partes.ts};`;

    const esperado = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
    return esperado.length === partes.v1.length &&
        crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(partes.v1));
}

/**
 * @param {object} opcoes
 * @param {{create: Function}} [opcoes.preferenceClient] cliente Preference do SDK
 * @param {{get: Function}} [opcoes.paymentClient] cliente Payment do SDK
 * @param {string} opcoes.urlBase URL pública do site (ex.: https://meurestaurante.com)
 * @param {number} [opcoes.valorEntrega] taxa de entrega do delivery em reais
 * @param {string} [opcoes.webhookSecret] assinatura secreta dos webhooks
 * @param {boolean} [opcoes.sandbox] usa sandbox_init_point (credenciais de teste)
 */
function criarApp(opcoes) {
    const {
        preferenceClient, paymentClient, urlBase,
        valorEntrega = 0, webhookSecret, sandbox = false,
        itensCardapio = indexarPorId(carregarMenu()),
        aoReceberPagamento = (p) => console.log('[webhook] pagamento', p.id, p.status, p.external_reference)
    } = opcoes;

    const app = express();
    app.use(express.json({ limit: '50kb' }));

    const raiz = path.join(__dirname, '..');
    app.get('/', (req, res) => res.redirect('/online/'));
    for (const modo of MODOS) {
        app.use(`/${modo}`, express.static(path.join(raiz, modo)));
    }

    app.get('/api/config', (req, res) => {
        res.json({ mercadoPagoAtivo: Boolean(preferenceClient), valorEntrega });
    });

    // Cria a preferência do Checkout Pro e devolve a URL de pagamento.
    app.post('/api/pagamento/preferencia', async (req, res) => {
        if (!preferenceClient) {
            return res.status(503).json({ erro: 'Pagamento online indisponível no momento.' });
        }
        try {
            const { modo, carrinho, entrega } = req.body || {};
            if (!MODOS.includes(modo)) throw new ErroPedido('Modo de pedido inválido.');

            const taxa = modo === 'online' ? valorEntrega : 0;
            const itensValidados = validarCarrinho(carrinho, itensCardapio);
            const referencia = gerarReferencia(modo);
            const body = montarPreferencia({
                itensValidados, modo, entrega, valorEntrega: taxa, urlBase, referencia
            });

            const preferencia = await preferenceClient.create({ body });
            const url = sandbox ? (preferencia.sandbox_init_point || preferencia.init_point) : preferencia.init_point;

            res.json({
                id: preferencia.id,
                url,
                referencia,
                total: calcularTotal(itensValidados, taxa)
            });
        } catch (erro) {
            if (erro instanceof ErroPedido) return res.status(400).json({ erro: erro.message });
            console.error('[mercadopago] erro ao criar preferência:', erro && (erro.message || erro));
            res.status(502).json({ erro: 'Não foi possível iniciar o pagamento. Tente novamente.' });
        }
    });

    // Consulta o status real do pagamento (o navegador não é confiável).
    app.get('/api/pagamento/status/:id', async (req, res) => {
        if (!paymentClient) return res.status(503).json({ erro: 'Pagamento online indisponível.' });
        if (!/^\d{1,20}$/.test(req.params.id)) return res.status(400).json({ erro: 'ID de pagamento inválido.' });
        try {
            const p = await paymentClient.get({ id: req.params.id });
            res.json({
                id: p.id,
                status: p.status,
                status_detail: p.status_detail,
                referencia: p.external_reference,
                valor: p.transaction_amount,
                metodo: p.payment_method_id
            });
        } catch (erro) {
            console.error('[mercadopago] erro ao consultar pagamento:', erro && (erro.message || erro));
            res.status(404).json({ erro: 'Pagamento não encontrado.' });
        }
    });

    // Notificações (webhook) enviadas pelo Mercado Pago.
    app.post('/api/pagamento/webhook', async (req, res) => {
        if (webhookSecret && !assinaturaValida(req, webhookSecret)) {
            return res.sendStatus(401);
        }
        const tipo = req.query.type || req.query.topic || (req.body && req.body.type);
        const id = req.query['data.id'] || (req.body && req.body.data && req.body.data.id);

        // Responde rápido para o Mercado Pago não reenviar a notificação.
        res.sendStatus(200);

        if (tipo === 'payment' && id && paymentClient) {
            try {
                const pagamento = await paymentClient.get({ id });
                await aoReceberPagamento(pagamento);
            } catch (erro) {
                console.error('[webhook] falha ao processar pagamento', id, erro && (erro.message || erro));
            }
        }
    });

    return app;
}

module.exports = { criarApp, assinaturaValida };

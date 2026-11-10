const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { criarApp } = require('../server/app');
const { carregarMenu, indexarPorId } = require('../server/cardapio');
const { validarCarrinho, calcularTotal, montarPreferencia } = require('../server/pagamento');

const itens = indexarPorId(carregarMenu());

function mockPreference() {
    const chamadas = [];
    return {
        chamadas,
        create: async ({ body }) => {
            chamadas.push(body);
            return { id: 'pref-123', init_point: 'https://mp/checkout', sandbox_init_point: 'https://sandbox.mp/checkout' };
        }
    };
}

async function iniciar(opcoes) {
    const app = criarApp({ urlBase: 'http://localhost:3000', itensCardapio: itens, ...opcoes });
    const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    return { base, fechar: () => new Promise((ok) => server.close(ok)) };
}

test('cardápio não tem IDs duplicados e os dois modos usam o mesmo cardápio', () => {
    const online = carregarMenu();
    const presencial = carregarMenu(require('path').join(__dirname, '..', 'presencial', 'js', 'dados.js'));
    assert.equal(JSON.stringify(online), JSON.stringify(presencial));
    assert.equal(itens.size, 72);
});

test('valida carrinho usando o preço do servidor e agrupa itens repetidos', () => {
    const r = validarCarrinho([
        { id: 'trad-feijoada-completa', qntd: 2, price: 0.01 },
        { id: 'trad-feijoada-completa', qntd: 1 },
        { id: 'trad-curau-de-milho', qntd: 1 }
    ], itens);
    assert.equal(r.length, 2);
    assert.equal(r[0].qntd, 3);
    assert.equal(calcularTotal(r), 80 * 3 + 30);
    assert.equal(calcularTotal(r, 7.5), 277.5);
});

test('rejeita carrinho vazio, item inexistente e quantidades inválidas', () => {
    assert.throws(() => validarCarrinho([], itens), /vazio/);
    assert.throws(() => validarCarrinho([{ id: 'nao-existe', qntd: 1 }], itens), /inválido/);
    for (const qntd of [0, -1, 1.5, 51, 'abc']) {
        assert.throws(() => validarCarrinho([{ id: 'trad-acaraje', qntd }], itens), /Quantidade/);
    }
});

test('preferência só usa auto_return e webhook com URL https', () => {
    const itensValidados = validarCarrinho([{ id: 'trad-acaraje', qntd: 1 }], itens);
    const local = montarPreferencia({ itensValidados, modo: 'online', urlBase: 'http://localhost:3000', referencia: 'X' });
    assert.equal(local.auto_return, undefined);
    assert.equal(local.notification_url, undefined);
    assert.equal(local.back_urls.success, 'http://localhost:3000/online/?pagamento=sucesso');

    const prod = montarPreferencia({ itensValidados, modo: 'presencial', urlBase: 'https://go.com', referencia: 'X', entrega: { mesa: '7', nome: 'Ana' } });
    assert.equal(prod.auto_return, 'approved');
    assert.equal(prod.notification_url, 'https://go.com/api/pagamento/webhook');
    assert.deepEqual(prod.metadata, { modo: 'presencial', mesa: '7', nome: 'Ana' });
});

test('POST /api/pagamento/preferencia cria a preferência com preços oficiais', async () => {
    const preference = mockPreference();
    const { base, fechar } = await iniciar({ preferenceClient: preference, valorEntrega: 5 });
    try {
        const r = await fetch(`${base}/api/pagamento/preferencia`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                modo: 'online',
                carrinho: [{ id: 'trad-costela', qntd: 2 }],
                entrega: { cep: '07000-000', endereco: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Guarulhos', uf: 'SP' }
            })
        });
        const json = await r.json();
        assert.equal(r.status, 200);
        assert.equal(json.url, 'https://mp/checkout');
        assert.equal(json.total, 335);
        assert.match(json.referencia, /^DELIV-/);

        const body = preference.chamadas[0];
        assert.equal(body.items[0].unit_price, 165);
        assert.equal(body.items[0].quantity, 2);
        assert.equal(body.items[1].id, 'taxa-entrega');
        assert.equal(body.external_reference, json.referencia);
        assert.equal(body.metadata.cidade, 'Guarulhos');
    } finally { await fechar(); }
});

test('modo sandbox devolve o sandbox_init_point; presencial não cobra entrega', async () => {
    const preference = mockPreference();
    const { base, fechar } = await iniciar({ preferenceClient: preference, sandbox: true, valorEntrega: 5 });
    try {
        const r = await fetch(`${base}/api/pagamento/preferencia`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ modo: 'presencial', carrinho: [{ id: 'trad-acaraje', qntd: 1 }], entrega: { mesa: '3', nome: 'João' } })
        });
        const json = await r.json();
        assert.equal(json.url, 'https://sandbox.mp/checkout');
        assert.equal(json.total, 99);
        assert.equal(preference.chamadas[0].items.length, 1);
    } finally { await fechar(); }
});

test('erros: sem token (503), modo inválido (400), falha no Mercado Pago (502)', async () => {
    let s = await iniciar({});
    try {
        const cfg = await (await fetch(`${s.base}/api/config`)).json();
        assert.equal(cfg.mercadoPagoAtivo, false);
        const r = await fetch(`${s.base}/api/pagamento/preferencia`, { method: 'POST' });
        assert.equal(r.status, 503);
    } finally { await s.fechar(); }

    s = await iniciar({ preferenceClient: { create: async () => { throw new Error('boom'); } } });
    try {
        const enviar = (body) => fetch(`${s.base}/api/pagamento/preferencia`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
        });
        assert.equal((await enviar({ modo: 'x', carrinho: [] })).status, 400);
        assert.equal((await enviar({ modo: 'online', carrinho: [{ id: 'trad-acaraje', qntd: 1 }] })).status, 502);
    } finally { await s.fechar(); }
});

test('GET /api/pagamento/status consulta o pagamento e valida o id', async () => {
    const paymentClient = {
        get: async ({ id }) => ({ id: Number(id), status: 'approved', status_detail: 'accredited', external_reference: 'DELIV-1', transaction_amount: 99, payment_method_id: 'pix' })
    };
    const { base, fechar } = await iniciar({ paymentClient });
    try {
        const ok = await (await fetch(`${base}/api/pagamento/status/123`)).json();
        assert.deepEqual(ok, { id: 123, status: 'approved', status_detail: 'accredited', referencia: 'DELIV-1', valor: 99, metodo: 'pix' });
        assert.equal((await fetch(`${base}/api/pagamento/status/abc`)).status, 400);
    } finally { await fechar(); }
});

test('webhook valida assinatura e processa o pagamento', async () => {
    const recebidos = [];
    const segredo = 'segredo-teste';
    const { base, fechar } = await iniciar({
        webhookSecret: segredo,
        paymentClient: { get: async ({ id }) => ({ id, status: 'approved' }) },
        aoReceberPagamento: (p) => recebidos.push(p)
    });
    try {
        const url = `${base}/api/pagamento/webhook?data.id=555&type=payment`;
        const corpo = JSON.stringify({ type: 'payment', data: { id: '555' } });
        const headers = { 'content-type': 'application/json' };

        assert.equal((await fetch(url, { method: 'POST', headers, body: corpo })).status, 401);

        const ts = '1700000000';
        const v1 = crypto.createHmac('sha256', segredo).update(`id:555;request-id:req-1;ts:${ts};`).digest('hex');
        const r = await fetch(url, {
            method: 'POST', body: corpo,
            headers: { ...headers, 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1' }
        });
        assert.equal(r.status, 200);
        await new Promise((ok) => setTimeout(ok, 50));
        assert.deepEqual(recebidos, [{ id: '555', status: 'approved' }]);
    } finally { await fechar(); }
});

test('servidor entrega as páginas estáticas', async () => {
    const { base, fechar } = await iniciar({});
    try {
        for (const caminho of ['/online/', '/presencial/', '/online/js/mercadopago.js']) {
            assert.equal((await fetch(base + caminho)).status, 200, caminho);
        }
        const raiz = await fetch(base + '/', { redirect: 'manual' });
        assert.equal(raiz.headers.get('location'), '/online/');
    } finally { await fechar(); }
});

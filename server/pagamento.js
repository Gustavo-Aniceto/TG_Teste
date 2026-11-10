// Regras de negócio do pagamento: valida o carrinho e monta a preferência
// do Checkout Pro do Mercado Pago. Não faz chamadas de rede (fácil de testar).
const crypto = require('crypto');

const QNTD_MAXIMA_POR_ITEM = 50;

class ErroPedido extends Error {
    constructor(mensagem) {
        super(mensagem);
        this.status = 400;
    }
}

// Recebe o carrinho enviado pelo navegador ([{ id, qntd }]) e devolve os
// itens com nome e preço oficiais do cardápio.
function validarCarrinho(carrinho, itensCardapio) {
    if (!Array.isArray(carrinho) || carrinho.length === 0) {
        throw new ErroPedido('Seu carrinho está vazio.');
    }

    const agrupados = new Map();
    for (const linha of carrinho) {
        const id = linha && String(linha.id);
        const qntd = Number(linha && linha.qntd);
        const item = itensCardapio.get(id);

        if (!item) throw new ErroPedido(`Item inválido no carrinho: ${id}`);
        if (!Number.isInteger(qntd) || qntd < 1 || qntd > QNTD_MAXIMA_POR_ITEM) {
            throw new ErroPedido(`Quantidade inválida para ${item.name}.`);
        }

        const atual = agrupados.get(id);
        agrupados.set(id, { item, qntd: (atual ? atual.qntd : 0) + qntd });
    }

    return [...agrupados.values()];
}

function calcularTotal(itensValidados, valorEntrega = 0) {
    const centavos = itensValidados.reduce(
        (soma, { item, qntd }) => soma + Math.round(item.price * 100) * qntd, 0
    ) + Math.round(valorEntrega * 100);
    return centavos / 100;
}

function gerarReferencia(modo) {
    const prefixo = modo === 'presencial' ? 'MESA' : 'DELIV';
    return `${prefixo}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function limparTexto(valor, max = 120) {
    return String(valor == null ? '' : valor).trim().slice(0, max);
}

// Monta o corpo da preferência (POST /checkout/preferences).
function montarPreferencia({ itensValidados, modo, entrega, valorEntrega = 0, urlBase, referencia }) {
    const urlSite = `${urlBase}/${modo}/`;
    const items = itensValidados.map(({ item, qntd }) => ({
        id: item.id,
        title: item.name,
        description: limparTexto(item.dsc, 250) || item.name,
        category_id: 'food',
        quantity: qntd,
        currency_id: 'BRL',
        unit_price: Number(item.price.toFixed(2))
    }));

    if (valorEntrega > 0) {
        items.push({
            id: 'taxa-entrega', title: 'Taxa de entrega', quantity: 1,
            currency_id: 'BRL', unit_price: Number(valorEntrega.toFixed(2))
        });
    }

    const metadata = { modo };
    if (modo === 'presencial') {
        metadata.mesa = limparTexto(entrega && entrega.mesa, 20);
        metadata.nome = limparTexto(entrega && entrega.nome, 80);
    } else if (entrega) {
        for (const campo of ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf', 'complemento']) {
            metadata[campo] = limparTexto(entrega[campo]);
        }
    }

    const corpo = {
        items,
        external_reference: referencia,
        statement_descriptor: 'G&O RESTAURANTE',
        metadata,
        back_urls: {
            success: `${urlSite}?pagamento=sucesso`,
            failure: `${urlSite}?pagamento=falha`,
            pending: `${urlSite}?pagamento=pendente`
        }
    };

    // O Mercado Pago só aceita retorno automático e webhook em URLs públicas (https).
    if (urlBase.startsWith('https://')) {
        corpo.auto_return = 'approved';
        corpo.notification_url = `${urlBase}/api/pagamento/webhook`;
    }

    return corpo;
}

module.exports = {
    ErroPedido, QNTD_MAXIMA_POR_ITEM,
    validarCarrinho, calcularTotal, gerarReferencia, montarPreferencia
};

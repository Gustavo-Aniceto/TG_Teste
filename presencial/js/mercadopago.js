// =====================================================================
// Pagamento com Mercado Pago (Checkout Pro)
//
// Fluxo:
// 1. Na etapa 3 (resumo) o cliente clica em "Pagar com Mercado Pago".
// 2. O navegador envia o carrinho (id + quantidade) para o nosso servidor
//    (POST /api/pagamento/preferencia). O servidor busca os preços oficiais
//    no cardápio, cria a preferência no Mercado Pago e devolve a URL.
// 3. O cliente paga no site do Mercado Pago e volta para cá com
//    ?pagamento=sucesso|pendente|falha&payment_id=...
// 4. Consultamos o status real no servidor (GET /api/pagamento/status/:id)
//    e, se aprovado, mostramos a confirmação e o botão para enviar o
//    pedido (já pago) para o WhatsApp do restaurante.
//
// Este arquivo é igual nas versões "online" e "presencial"; o que muda é a
// variável MODO, definida no app.js.
// =====================================================================

var MP_ATIVO = false;
var CHAVE_PEDIDO_PENDENTE = 'go_pedido_mp_' + MODO;

cardapio.pagamento = {

    init: () => {
        // abrindo o index.html direto do computador (file://) não há servidor
        if (window.location.protocol === 'file:') {
            return;
        }

        $.getJSON('/api/config')
            .done((config) => {
                MP_ATIVO = Boolean(config.mercadoPagoAtivo);

                if (MODO === 'online') {
                    VALOR_ENTREGA = Number(config.valorEntrega) || 0;
                    cardapio.metodos.carregarValores();
                }
            });

        cardapio.pagamento.verificarRetorno();
    },

    // dados de entrega enviados ao servidor (vão no "metadata" do pagamento)
    dadosEntrega: () => {
        if (MODO === 'presencial') {
            return { mesa: MEU_ENDERECO.endereco, nome: MEU_ENDERECO.nome };
        }
        return MEU_ENDERECO;
    },

    // Clique no botão "Pagar com Mercado Pago"
    pagar: () => {
        if (MEU_CARRINHO.length <= 0 || MEU_ENDERECO == null) {
            cardapio.metodos.mensagem('Seu carrinho está vazio.');
            return;
        }

        let botao = $("#btnPagarMercadoPago");
        if (botao.hasClass('carregando')) return;

        botao.addClass('carregando').html('<i class="fas fa-spinner fa-spin"></i> Aguarde...');

        $.ajax({
            url: '/api/pagamento/preferencia',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                modo: MODO,
                carrinho: $.map(MEU_CARRINHO, (e) => ({ id: e.id, qntd: e.qntd })),
                entrega: cardapio.pagamento.dadosEntrega()
            })
        })
            .done((resposta) => {
                // guarda o pedido para conseguir montar a confirmação na volta
                try {
                    localStorage.setItem(CHAVE_PEDIDO_PENDENTE, JSON.stringify({
                        referencia: resposta.referencia,
                        carrinho: MEU_CARRINHO,
                        endereco: MEU_ENDERECO
                    }));
                } catch (e) { }

                window.location.href = resposta.url;
            })
            .fail((xhr) => {
                let erro = (xhr.responseJSON && xhr.responseJSON.erro) || 'Não foi possível conectar ao Mercado Pago.';
                cardapio.metodos.mensagem(erro);
                cardapio.pagamento.restaurarBotao();
            });
    },

    restaurarBotao: () => {
        $("#btnPagarMercadoPago")
            .removeClass('carregando')
            .html('<i class="fas fa-credit-card"></i> Pagar com Mercado Pago');
    },

    // Trata a volta do Mercado Pago (?pagamento=...&payment_id=...)
    verificarRetorno: () => {
        let params = new URLSearchParams(window.location.search);
        let retorno = params.get('pagamento');

        if (!retorno) return;

        let paymentId = params.get('payment_id') || params.get('collection_id');

        // limpa a URL para não processar de novo ao recarregar a página
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

        if (!paymentId || paymentId === 'null') {
            cardapio.metodos.mensagem('Pagamento não concluído. Seu carrinho foi mantido, tente novamente.', 'red', 6000);
            return;
        }

        $.getJSON('/api/pagamento/status/' + encodeURIComponent(paymentId))
            .done((pagamento) => {
                if (pagamento.status === 'approved') {
                    cardapio.pagamento.concluirPedido(pagamento, true);
                } else if (pagamento.status === 'pending' || pagamento.status === 'in_process') {
                    cardapio.pagamento.concluirPedido(pagamento, false);
                } else {
                    cardapio.metodos.mensagem('Pagamento recusado. Seu carrinho foi mantido, tente outra forma de pagamento.', 'red', 6000);
                }
            })
            .fail(() => {
                cardapio.metodos.mensagem('Não conseguimos confirmar o pagamento. Fale com o restaurante.', 'red', 6000);
            });
    },

    // Mostra a confirmação e o botão para avisar o restaurante pelo WhatsApp
    concluirPedido: (pagamento, aprovado) => {
        let pedido = null;
        try {
            pedido = JSON.parse(localStorage.getItem(CHAVE_PEDIDO_PENDENTE) || 'null');
        } catch (e) { }

        if (!pedido || pedido.referencia !== pagamento.referencia) {
            // pagamento feito em outro navegador/aparelho
            cardapio.metodos.mensagem(aprovado
                ? `Pagamento aprovado! Pedido ${pagamento.referencia}.`
                : `Pagamento pendente. Pedido ${pagamento.referencia}.`, aprovado ? 'green' : 'yellow', 8000);
            return;
        }

        MEU_CARRINHO = pedido.carrinho;
        MEU_ENDERECO = pedido.endereco;

        let situacao = aprovado ? 'APROVADO ✅' : 'PENDENTE ⏳';
        let info = `*Pagamento:* Mercado Pago - ${situacao}`;
        info += `\n*Pedido:* ${pagamento.referencia}`;
        info += `\n*ID do pagamento:* ${pagamento.id}`;

        // abre o resumo com o link do WhatsApp já contendo o comprovante
        $('#modalCarrinho').removeClass('hidden');
        cardapio.metodos.carregarEtapa(3);
        cardapio.metodos.carregarValores();
        cardapio.metodos.carregarResumo();
        cardapio.metodos.finalizarPedido(info);

        $("#lblTituloEtapa").text(aprovado ? 'Pagamento aprovado! 🎉' : 'Pagamento em análise');
        $("#avisoPagamento")
            .removeClass('hidden aviso-pendente')
            .addClass(aprovado ? '' : 'aviso-pendente')
            .html(aprovado
                ? `<i class="fas fa-check-circle"></i> Recebemos seu pagamento de <b>${cardapio.metodos.formatarMoeda(Number(pagamento.valor) || 0)}</b>. Pedido <b>${pagamento.referencia}</b>.<br>Clique em <b>Enviar pedido ao restaurante</b> para confirmar pelo WhatsApp.`
                : `<i class="fas fa-clock"></i> Seu pagamento está sendo processado (ex.: Pix ou boleto). Pedido <b>${pagamento.referencia}</b>.<br>Envie o pedido pelo WhatsApp para o restaurante acompanhar.`);

        $("#btnPagarMercadoPago").addClass('hidden');
        $("#btnVoltar").addClass('hidden');
        $("#btnEtapaEnviarResumo").text('Enviar pedido ao restaurante');

        // pedido finalizado: esvazia o carrinho
        try { localStorage.removeItem(CHAVE_PEDIDO_PENDENTE); } catch (e) { }
        cardapio.metodos.limparCarrinho();
    }
}

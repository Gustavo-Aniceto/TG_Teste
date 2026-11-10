
$(document).ready(function () { // pega o elemento "document", após ele está todo carregado
    cardapio.eventos.init();
});

var cardapio = {};

var MEU_CARRINHO = [];
var MEU_ENDERECO = null;
var VALOR_CARRINHO = 0;
var VALOR_ENTREGA = 0; // atualizado pelo servidor (/api/config)

// 'online' = delivery | 'presencial' = pedido na mesa
var MODO = 'presencial';
var CHAVE_CARRINHO = 'go_carrinho_' + MODO;

var CELULAR_EMPRESA = '5511958705804';

cardapio.eventos = {
    init: () => {
        cardapio.metodos.restaurarCarrinho();
        cardapio.metodos.obterItensCardapio();

        if (cardapio.pagamento) {
            cardapio.pagamento.init();
        }
    }
}


cardapio.metodos = {

    // obtem a lista de itens do cardápio
    obterItensCardapio: (categoria = 'Tradicionais', vermais = false) => {
        var filtro = MENU[categoria];

        if (!vermais) {
            $("#itensCardapio").html('')
            $("#btnVerMais").removeClass('hidden');
        }

        $.each(filtro, (i, e) => {
            let temp = cardapio.templates.item.replace(/\${img}/g, e.img)
                .replace(/\${name}/g, e.name)
                .replace(/\${price}/g, e.price.toFixed(2).replace('.', ','))
                .replace(/\${id}/g, e.id)
                .replace(/\${dsc}/g, e.dsc)

            if (vermais && i >= 8 && i < 12) {
                $("#itensCardapio").append(temp)
            }

            if (!vermais && i < 8) {
                $("#itensCardapio").append(temp)
            }
        })

        // remove o ativo
        $(".container-menu a").removeClass('active');

        // seta o menu para ativo
        $("#menu-" + categoria).addClass('active');
    },

    // Clique no botão de ver mais
    verMais: () => {
        var ativo = $(".container-menu a.active").attr('id').split('menu-')[1];
        cardapio.metodos.obterItensCardapio(ativo, true);

        $("#btnVerMais").addClass('hidden');
    },

    // Diminuir a quantidade do item no cardápio
    diminuirQuantidade: (id) => {
        let qntdAtual = parseInt($('#qntd-' + id).text());

        if (qntdAtual > 0) {
            $('#qntd-' + id).text(qntdAtual - 1)
        }
    },

    // Aumentar a quantidade do item no cardápio
    aumentarQuantidade: (id) => {
        let qntdAtual = parseInt($('#qntd-' + id).text());

        $('#qntd-' + id).text(qntdAtual + 1)
    },

    // procura o item em todas as categorias do cardápio
    buscarItemCardapio: (id) => {
        let encontrado = null;

        $.each(MENU, (categoria, itens) => {
            $.each(itens, (i, e) => {
                if (e.id == id) {
                    encontrado = e;
                    return false;
                }
            })
            if (encontrado) return false;
        })

        return encontrado;
    },

    // Adicionar ao carrinho o item do cardápio
    adicionarAoCarrinho: (id) => {
        let qntdAtual = parseInt($('#qntd-' + id).text());

        if (qntdAtual <= 0) {
            cardapio.metodos.mensagem('Escolha a quantidade antes de adicionar.');
            return;
        }

        let item = cardapio.metodos.buscarItemCardapio(id);

        if (!item) {
            cardapio.metodos.mensagem('Item não encontrado no cardápio.');
            return;
        }

        // Verificar se o item já existe no carrinho
        let objIndex = MEU_CARRINHO.findIndex((obj => obj.id == id));

        if (objIndex >= 0) {
            // Caso já exista o item no carrinho, apenas altera a quantidade
            MEU_CARRINHO[objIndex].qntd += qntdAtual;
        } else {
            // Caso não exista, adiciona uma CÓPIA do item (para não alterar o MENU)
            MEU_CARRINHO.push($.extend({}, item, { qntd: qntdAtual }));
        }

        cardapio.metodos.mensagem('Item adicionado ao carrinho', 'green');
        $('#qntd-' + id).text(0);

        cardapio.metodos.atualizarBadgeTotal();
    },

    // salva o carrinho no navegador (não perde o pedido ao recarregar a página
    // ou ao voltar do Mercado Pago)
    salvarCarrinho: () => {
        try {
            localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(MEU_CARRINHO));
        } catch (e) { }
    },

    restaurarCarrinho: () => {
        try {
            let salvo = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || '[]');

            // mantém apenas itens que ainda existem no cardápio, com o preço atual
            MEU_CARRINHO = $.map(salvo, (e) => {
                let item = cardapio.metodos.buscarItemCardapio(e.id);
                let qntd = parseInt(e.qntd);
                return item && qntd > 0 ? $.extend({}, item, { qntd: qntd }) : null;
            });
        } catch (e) {
            MEU_CARRINHO = [];
        }

        cardapio.metodos.atualizarBadgeTotal();
    },

    limparCarrinho: () => {
        MEU_CARRINHO = [];
        cardapio.metodos.atualizarBadgeTotal();
    },

    atualizarBadgeTotal: () => {
        var total = 0;

        $.each(MEU_CARRINHO, (i, e) => {
            total += e.qntd
        })

        if (total > 0) {
            $(".botao-carrinho").removeClass('hidden')
            $(".container-total-carrinho").removeClass('hidden')
        } else {
            $(".botao-carrinho").addClass('hidden')
            $(".container-total-carrinho").addClass('hidden')
        }

        $(".badge-total-carrinho").html(total);

        cardapio.metodos.salvarCarrinho();
    },

    // abrir a modal de carrinho
    abrirCarrinho: (abrir) => {
        const modalCarrinho = $('#modalCarrinho');
        if (abrir) {
            modalCarrinho.removeClass('hidden');
            cardapio.metodos.carregarCarrinho();
        } else {
            modalCarrinho.addClass('hidden');
        }
    },

       //Altera os textos e exibe os botões das etapas
       carregarEtapa: (etapa) => {
        if (etapa == 1) {
            $("#lblTituloEtapa").text('Seu carrinho:')
            $("#itensCarrinho").removeClass('hidden')
            $("#localEntrega").addClass('hidden')
            $("#resumoCarrinho").addClass('hidden')

            $(".etapa").removeClass('active')
            $(".etapa1").addClass('active')

            $("#btnEtapaPedido").removeClass('hidden')
            $("#btnEtapaEndereco").addClass('hidden')
            $("#btnEtapaEnviarResumo").addClass('hidden')
            $("#btnPagarMercadoPago").addClass('hidden')
            $("#btnVoltar").addClass('hidden')
        }

        if (etapa == 2) {
            $("#lblTituloEtapa").text('Mesa e identificação:')
            $("#itensCarrinho").addClass('hidden')
            $("#localEntrega").removeClass('hidden')
            $("#resumoCarrinho").addClass('hidden')

            $(".etapa").removeClass('active')
            $(".etapa1").addClass('active')
            $(".etapa2").addClass('active')

            $("#btnEtapaPedido").addClass('hidden')
            $("#btnEtapaEndereco").removeClass('hidden')
            $("#btnEtapaEnviarResumo").addClass('hidden')
            $("#btnPagarMercadoPago").addClass('hidden')
            $("#btnVoltar").removeClass('hidden')
        }

        if (etapa == 3) {
            $("#lblTituloEtapa").text('Resumo do pedido:')
            $("#itensCarrinho").addClass('hidden')
            $("#localEntrega").addClass('hidden')
            $("#resumoCarrinho").removeClass('hidden')

            $(".etapa").removeClass('active')
            $(".etapa1").addClass('active')
            $(".etapa2").addClass('active')
            $(".etapa3").addClass('active')

            $("#btnEtapaPedido").addClass('hidden')
            $("#btnEtapaEndereco").addClass('hidden')
            $("#btnEtapaEnviarResumo").removeClass('hidden').text('Pedir pelo WhatsApp')
            $("#btnVoltar").removeClass('hidden')
            $("#avisoPagamento").addClass('hidden')

            // o botão do Mercado Pago só aparece se o servidor estiver configurado
            if (typeof MP_ATIVO !== 'undefined' && MP_ATIVO) {
                $("#btnPagarMercadoPago").removeClass('hidden')
            } else {
                $("#btnPagarMercadoPago").addClass('hidden')
            }
        }

    },


    // botão de voltar etapa
    voltarEtapa: () => {

        let etapa = $(".etapa.active").length;
        cardapio.metodos.carregarEtapa(etapa - 1);

    },

    // carrega a lista de itens do carrinho
    carregarCarrinho: () => {

        cardapio.metodos.carregarEtapa(1);

        if(MEU_CARRINHO.length > 0) {

            $("#itensCarrinho").html('');

            $.each(MEU_CARRINHO, (i, e) => {
                let temp = cardapio.templates.itemCarrinho.replace(/\${img}/g, e.img)
                .replace(/\${nome}/g, e.name)
                .replace(/\${preco}/g, e.price.toFixed(2).replace('.', ','))
                .replace(/\${id}/g, e.id)
                .replace(/\${dsc}/g, e.dsc)
                .replace(/\${qntd}/g, e.qntd);

                $("#itensCarrinho").append(temp);

                // ultimo item
                if((i+1) == MEU_CARRINHO.length) {
                    cardapio.metodos.carregarValores();
                }
            })
        } else {
            $("#itensCarrinho").html('<p class="carrinho-vazio"><i class="fa fa-shopping-bag"></i> Seu carrinho está vazio.</p>');
            cardapio.metodos.carregarValores();
        }
    },

    // diminuir a quantidade do item no carrinho
    diminuirQuantidadeCarrinho: (id) => {
        let qntdAtual = parseInt($('#qntd-carrinho-'+id).text()); 

        if(qntdAtual > 1) {
            $('#qntd-carrinho-'+id).text(qntdAtual - 1);
            cardapio.metodos.atualizarCarrinho(id, qntdAtual - 1);
        } else {
            cardapio.metodos.removerItemCarrinho(id);
        }
    },

    // aumentar a quantidade do item no carrinho
    aumentarQuantidadeCarrinho: (id) => {
        let qntdAtual = parseInt($('#qntd-carrinho-'+id).text());
        $('#qntd-carrinho-'+id).text(qntdAtual + 1);
        cardapio.metodos.atualizarCarrinho(id, qntdAtual + 1);
    },

    // botão remover item do carrinho
    removerItemCarrinho: (id) => {
        MEU_CARRINHO = $.grep(MEU_CARRINHO, (e, i) => { return e.id != id });
        cardapio.metodos.carregarCarrinho();

        // atualiza o botão carrinho com a quantidade atualizada
        cardapio.metodos.atualizarBadgeTotal();
    },

    // atualiza o carrinho com a quantidade atual
    atualizarCarrinho: (id, qntd) => {

        let objIndex = MEU_CARRINHO.findIndex((obj => obj.id == id));
        MEU_CARRINHO[objIndex].qntd = qntd;

        // atualiza o botão carrinho com a quantidade atualizada
        cardapio.metodos.atualizarBadgeTotal();
        
        // atualiza os valores (R$) totais do carrinho
        cardapio.metodos.carregarValores();
    },

    // carrega os valores de SubTotal, Entrega e Total
    carregarValores: () => {
        VALOR_CARRINHO = 0;

        $.each(MEU_CARRINHO, (i, e) => {
            VALOR_CARRINHO += parseFloat(e.price * e.qntd);
        })

        let entrega = MEU_CARRINHO.length > 0 ? VALOR_ENTREGA : 0;

        $("#lblSubTotal").text(cardapio.metodos.formatarMoeda(VALOR_CARRINHO));
        $("#lblValorEntrega").text('+ ' + cardapio.metodos.formatarMoeda(entrega));
        $("#lblValorTotal").text(cardapio.metodos.formatarMoeda(VALOR_CARRINHO + entrega));
    },

    formatarMoeda: (valor) => {
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    },

    carregarEndereco: () => {
        if(MEU_CARRINHO.length <= 0) {
            cardapio.metodos.mensagem('Seu carrinho está vazio.');
            return;
        }

        cardapio.metodos.carregarEtapa(2);
    },

    // validação antes de prosseguir para a etapa 3
    resumoPedido: () => {

        let mesa = $("#txtEndereco").val().trim();
        let nome = $("#txtNom").val().trim();

        if (mesa.length <= 0) {
            cardapio.metodos.mensagem('Informe o número da sua mesa, por favor.');
            $("#txtEndereco").focus();
            return;
        }

        if (nome.length <= 0) {
            cardapio.metodos.mensagem('Informe o seu nome, por favor.');
            $("#txtNom").focus();
            return;
        }

        // mantém o nome MEU_ENDERECO para reaproveitar o fluxo do delivery
        MEU_ENDERECO = {
            endereco: mesa,
            nome: nome
        }

        cardapio.metodos.carregarEtapa(3);
        cardapio.metodos.carregarResumo();
    },

    // carrega a etapa de Resumo do pedido
    carregarResumo: () => {

        $("#listaItensResumo").html('');

        $.each(MEU_CARRINHO, (i, e) => {
            let temp = cardapio.templates.itemResumo.replace(/\${img}/g, e.img)
                .replace(/\${nome}/g, e.name)
                .replace(/\${preco}/g, e.price.toFixed(2).replace('.', ','))
                .replace(/\${qntd}/g, e.qntd);

            $("#listaItensResumo").append(temp);
        })

        $("#resumoEndereco").text(MEU_ENDERECO.endereco)
        $("#resumoNome").text(MEU_ENDERECO.nome)
    
        cardapio.metodos.finalizarPedido();
    },

    // Monta o texto do pedido que vai para o WhatsApp do restaurante
    // (infoPagamento é usado depois que o cliente paga pelo Mercado Pago)
    montarTextoPedido: (infoPagamento) => {
        let itens = '';

        $.each(MEU_CARRINHO, (i, e) => {
            itens += `*${e.qntd}x* ${e.name} .......  ${cardapio.metodos.formatarMoeda(e.price)} \n`
        })

        var texto = 'Olá! Gostaria de fazer um pedido:'
        texto += `\n*Itens do pedido:* \n\n${itens}`
        texto += `\n*Mesa:* ${MEU_ENDERECO.endereco}`
        texto += `\n*Nome:* ${MEU_ENDERECO.nome}`
        texto += `\n\n*Valor Total: ${cardapio.metodos.formatarMoeda(VALOR_CARRINHO + VALOR_ENTREGA)}*`

        if (infoPagamento) {
            texto += `\n\n${infoPagamento}`
        } else {
            texto += `\n\n*Pagamento:* no caixa / na mesa`
        }

        return texto;
    },

    // Atualiza o link do botão do WhatsApp
    finalizarPedido: (infoPagamento) => {

        if (MEU_CARRINHO.length > 0 && MEU_ENDERECO != null) {
            let texto = cardapio.metodos.montarTextoPedido(infoPagamento);
            let URL = `https://wa.me/${CELULAR_EMPRESA}?text=${encodeURIComponent(texto)}`;

            $("#btnEtapaEnviarResumo").attr('href', URL);
        }

    },



  // Mensagens 
  mensagem: (texto, cor = 'red', tempo = 3500) => {
    let id = Math.floor(Date.now() * Math.random().toString())

    let msg = `<div id="msg-${id}" class="animated fadeInDown toast ${cor}">${texto}</div>`

    $("#container-mensagens").append(msg)

    setTimeout(() => {
        $("#msg-" + id).removeClass('fadeInDown')
        $("#msg-" + id).addClass('fadeOutUp')
        setTimeout(() => {
            $("#msg-" + id).remove()
        }, 800)
    }, tempo)
}
}



cardapio.templates = {
    item: `
        <div class="col-12 col-lg-3 col-md-3 col-sm-6 mb-5 animated fadeInUp">
            <div class="card card-item" id="\${id}">
                <div class="img-produto">
                    <img src="\${img}" />
                </div>
                <p class="title-produto text-center mt-4">
                    <b>\${name}</b>
                </p>
                <p 
                    class="card-text">\${dsc}
                </p>
                <p class="price-produto text-center">
                    <b>R$ \${price}</b>
                </p>
                <div class="add-carrinho">
                    <span class="btn-menos" onclick="cardapio.metodos.diminuirQuantidade('\${id}')"><i class="fas fa-minus"></i></span>
                    <span class="add-numero-itens" id="qntd-\${id}">0</span>
                    <span class="btn-mais" onclick="cardapio.metodos.aumentarQuantidade('\${id}')"><i class="fas fa-plus"></i></span>
                    <span class="btn btn-add" onclick="cardapio.metodos.adicionarAoCarrinho('\${id}')"><i class="fa fa-shopping-bag"></i></span>
                </div>
            </div>
        </div>
    `,

    itemCarrinho: `
        <div class="col-12 item-carrinho">
            <div class="img-produto">
                <img src="\${img}" />
            </div>
            <div class="dados-produto">
                <p class="title-produto"><b>\${nome}</b></p>
                <p class="price-produto"><b>R$ \${preco}</b></p>
            </div>
            <div class="add-carrinho">
                <span class="btn-menos" onclick="cardapio.metodos.diminuirQuantidadeCarrinho('\${id}')"><i class="fas fa-minus"></i></span>
                <span class="add-numero-itens" id="qntd-carrinho-\${id}">\${qntd}</span>
                <span class="btn-mais" onclick="cardapio.metodos.aumentarQuantidadeCarrinho('\${id}')"><i class="fas fa-plus"></i></span>
                <span class="btn btn-remove no-mobile" onclick="cardapio.metodos.removerItemCarrinho('\${id}')"><i class="fa fa-times"></i></span>
            </div>
        </div>
    `,

    itemResumo: `
        <div class="col-12 item-carrinho resumo">
            <div class="img-produto-resumo">
                <img src="\${img}" />
            </div>
            <div class="dados-produto">
                <p class="title-produto-resumo">
                    <b>\${nome}</b>
                </p>
                <p class="price-produto-resumo">
                    <b>R$ \${preco}</b>
                </p>
            </div>
            <p class="quantidade-produto-resumo">
                x <b>\${qntd}</b>
            </p>
        </div>
    `
}

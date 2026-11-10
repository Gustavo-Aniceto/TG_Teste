// Carrega o cardápio (js/dados.js) no servidor.
// O preço cobrado no Mercado Pago SEMPRE vem daqui e nunca do navegador,
// assim ninguém consegue alterar o valor do pedido pelo DevTools.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function carregarMenu(arquivo = path.join(__dirname, '..', 'online', 'js', 'dados.js')) {
    const codigo = fs.readFileSync(arquivo, 'utf8');
    const contexto = {};
    vm.runInNewContext(`${codigo};\nthis.MENU = MENU;`, contexto);
    return contexto.MENU;
}

function indexarPorId(menu) {
    const itens = new Map();
    for (const [categoria, lista] of Object.entries(menu)) {
        for (const item of lista) {
            if (itens.has(item.id)) {
                throw new Error(`ID duplicado no cardápio: "${item.id}" (categoria ${categoria})`);
            }
            itens.set(item.id, { ...item, categoria });
        }
    }
    return itens;
}

module.exports = { carregarMenu, indexarPorId };

const axios = require('axios');
const PocketBase = require('pocketbase/cjs');

async function createOrcamentosSchema() {
    const pb = new PocketBase('https://backventure.venturexp.pro/');
    try {
        console.log("Autenticando...");
        const authData = await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
        const token = authData.token;

        const baseUrl = 'https://backventure.venturexp.pro/api/collections';
        const headers = {
            'Authorization': token,
            'Content-Type': 'application/json'
        };

        const newCollection = {
            name: "orcamentos",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: "",
            fields: [
                {
                    name: "cliente",
                    type: "text",
                    system: false,
                    required: true,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "documento_cliente",
                    type: "text",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "email_cliente",
                    type: "text",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "data_emissao",
                    type: "date",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "validade_dias",
                    type: "number",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "status",
                    type: "select",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false,
                    maxSelect: 1,
                    values: ["Aguardando", "Aprovado", "Recusado"]
                },
                {
                    name: "itens",
                    type: "json",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "valor_total",
                    type: "number",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "observacoes",
                    type: "text",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                }
            ]
        };

        console.log("Criando collection 'orcamentos'...");
        const createRes = await axios.post(baseUrl, newCollection, { headers });
        console.log("Coleção 'orcamentos' criada com sucesso.", createRes.data.id);
    } catch (e) {
        console.error("Erro ao criar coleção:", e.response?.data || e.message);
    }
}

createOrcamentosSchema();

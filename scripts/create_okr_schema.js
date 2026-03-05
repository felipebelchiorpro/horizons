const axios = require('axios');
const PocketBase = require('pocketbase/cjs');

async function createOKRSchema() {
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
            name: "objetivos_okr",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: "",
            fields: [
                {
                    name: "titulo",
                    type: "text",
                    system: false,
                    required: true,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "descricao",
                    type: "text",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "ano_trimestre",
                    type: "text",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "key_results",
                    type: "json",
                    system: false,
                    required: false,
                    hidden: false,
                    presentable: false
                },
                {
                    name: "progresso",
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
                    values: ["Em Andamento", "Concluído", "Pausado"]
                }
            ]
        };

        console.log("Criando collection 'objetivos_okr'...");
        const createRes = await axios.post(baseUrl, newCollection, { headers });
        console.log("Coleção 'objetivos_okr' criada com sucesso.", createRes.data.id);
    } catch (e) {
        console.error("Erro ao criar coleção:", e.response?.data || e.message);
    }
}

createOKRSchema();

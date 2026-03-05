const axios = require('axios');
const PocketBase = require('pocketbase/cjs');

async function setupDepartments() {
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

        // 1. Criar Coleção de Departamentos
        const newCollection = {
            name: "finance_departments",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: "",
            fields: [
                {
                    name: "nome",
                    type: "text",
                    system: false,
                    required: true,
                    hidden: false,
                    presentable: false
                }
            ]
        };

        console.log("Criando collection 'finance_departments'...");
        try {
            const createRes = await axios.post(baseUrl, newCollection, { headers });
            console.log("Coleção 'finance_departments' criada com sucesso.", createRes.data.id);
        } catch (e) {
            console.log("Coleção finance_departments já existe ou erro na criação:", e.response?.data?.message || e.message);
        }

        // 2. Adicionar o campo 'departamento' na coleção 'transactions'
        try {
            console.log("Buscando collection 'transactions'...");
            const transCollection = await axios.get(`${baseUrl}/transactions`, { headers });
            const schema = transCollection.data.fields;

            const hasDept = schema.find(f => f.name === 'departamento');
            if (!hasDept) {
                schema.push({
                    name: "departamento",
                    type: "text",
                    required: false,
                    system: false,
                    hidden: false
                });

                console.log("Atualizando collection 'transactions' para incluir 'departamento'...");
                await axios.patch(`${baseUrl}/transactions`, { fields: schema }, { headers });
                console.log("Campo 'departamento' adicionado a 'transactions'.");
            } else {
                console.log("Campo 'departamento' já existe em 'transactions'.");
            }

        } catch (e) {
            console.log("Erro ao buscar/atualizar transactions:", e.response?.data?.message || e.message);
        }

    } catch (e) {
        console.error("Erro fatal:", e.response?.data || e.message);
    }
}

setupDepartments();

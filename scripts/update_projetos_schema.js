const axios = require('axios');
const PocketBase = require('pocketbase/cjs');

async function updateSchema() {
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

        console.log("Buscando collection 'projetos'...");
        const getRes = await axios.get(`${baseUrl}/projetos`, { headers });
        const projCollection = getRes.data;

        if (!projCollection.fields) {
            console.error("Fields não retornado:", projCollection);
            return;
        }

        const hasValor = projCollection.fields.some(f => f.name === 'valor_projeto');
        if (!hasValor) {
            console.log("Adicionando campo 'valor_projeto' aos fields...");
            projCollection.fields.push({
                name: "valor_projeto",
                type: "number",
                system: false,
                required: false,
                hidden: false,
                presentable: false
            });

            console.log("Atualizando collection...");
            const updateRes = await axios.patch(`${baseUrl}/projetos`, {
                fields: projCollection.fields
            }, { headers });
            console.log("Coleção 'projetos' atualizada com sucesso.", updateRes.data.id);
        } else {
            console.log("Campo 'valor_projeto' já existe na collection 'projetos'.");
        }

    } catch (e) {
        console.error("Erro:", e.response?.data || e.message);
    }
}

updateSchema();

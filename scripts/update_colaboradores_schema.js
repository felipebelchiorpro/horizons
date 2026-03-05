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

        console.log("Buscando collection 'colaboradores'...");
        const getRes = await axios.get(`${baseUrl}/colaboradores`, { headers });
        const colabCollection = getRes.data;
        console.log("Collection info:", typeof colabCollection.fields);

        if (!colabCollection.fields) {
            console.error("Fields não retornado:", colabCollection);
            return;
        }

        const hasModulos = colabCollection.fields.some(f => f.name === 'modulos');
        if (!hasModulos) {
            console.log("Adicionando campo 'modulos' aos fields...");
            colabCollection.fields.push({
                name: "modulos",
                type: "json",
                system: false,
                required: false,
                hidden: false,
                presentable: false
            });

            console.log("Atualizando collection...");
            const updateRes = await axios.patch(`${baseUrl}/colaboradores`, {
                fields: colabCollection.fields
            }, { headers });
            console.log("Coleção 'colaboradores' atualizada com sucesso.", updateRes.data.id);
        } else {
            console.log("Campo 'modulos' já existe na collection 'colaboradores'.");
        }

    } catch (e) {
        console.error("Erro:", e.response?.data || e.message);
    }
}

updateSchema();

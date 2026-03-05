const PocketBase = require('pocketbase/cjs');
const axios = require('axios');

async function createDatabase() {
    const pb = new PocketBase('https://backventure.venturexp.pro/');

    try {
        console.log("1. Autenticando com PocketBase (API SDK)...");
        const authData = await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
        const token = authData.token;
        console.log("Token Admin obtido.");

        const baseUrl = 'https://backventure.venturexp.pro/api/collections';
        const headers = {
            'Authorization': token,
            'Content-Type': 'application/json'
        };

        // Regras de acesso vazias (Permite TUDO - Publico para teste)
        const rules = {
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        };

        // 1. Criar COLABORADORES
        console.log("\n2. Criando collection 'colaboradores' VIA AXIOS...");
        let colabsId = null;
        try {
            const res = await axios.post(baseUrl, {
                name: "colaboradores",
                type: "base",
                system: false,
                schema: [
                    { name: "nome", type: "text", required: true },
                    { name: "cargo", type: "text", required: true },
                    { name: "valor_hora", type: "number", required: true },
                    { name: "status", type: "select", options: { maxSelect: 1, values: ["Ativo", "Inativo"] } },
                    { name: "nivel_acesso", type: "select", options: { maxSelect: 1, values: ["Admin", "Colaborador"] } }
                ],
                ...rules
            }, { headers });
            colabsId = res.data.id;
            console.log("✓ Coleção 'colaboradores' criada com ID:", colabsId);
        } catch (e) {
            console.log("Colaboradores falhou (talvez já exista):", e.response?.data?.message || e.message);
            // tenta recuperar ID se existir
            try {
                const existing = await axios.get(`${baseUrl}/colaboradores`, { headers });
                colabsId = existing.data.id;
            } catch (err) { }
        }


        // 2. Criar PROJETOS
        console.log("\n3. Criando collection 'projetos' VIA AXIOS...");
        let prjId = null;
        if (colabsId) {
            try {
                const res = await axios.post(baseUrl, {
                    name: "projetos",
                    type: "base",
                    system: false,
                    schema: [
                        { name: "titulo", type: "text", required: true },
                        { name: "descricao", type: "text" },
                        { name: "cliente", type: "text" },
                        { name: "deadline", type: "date" },
                        {
                            name: "responsavel_id",
                            type: "relation",
                            options: { collectionId: colabsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
                        },
                        { name: "status", type: "select", options: { maxSelect: 1, values: ["Backlog", "Em Andamento", "Pendente", "Concluído"] } },
                        { name: "horas_estimadas", type: "number" }
                    ],
                    ...rules
                }, { headers });
                prjId = res.data.id;
                console.log("✓ Coleção 'projetos' criada com ID:", prjId);
            } catch (e) {
                console.log("Projetos falhou:", e.response?.data?.message || e.message);
                if (e.response?.data?.data) console.log(JSON.stringify(e.response.data.data, null, 2));
                try {
                    const existing = await axios.get(`${baseUrl}/projetos`, { headers });
                    prjId = existing.data.id;
                } catch (err) { }
            }
        }


        // 3. Criar TIME_LOGS
        console.log("\n4. Criando collection 'time_logs' VIA AXIOS...");
        if (prjId && colabsId) {
            try {
                const res = await axios.post(baseUrl, {
                    name: "time_logs",
                    type: "base",
                    system: false,
                    schema: [
                        {
                            name: "id_projeto",
                            type: "relation",
                            options: { collectionId: prjId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] }
                        },
                        {
                            name: "id_colaborador",
                            type: "relation",
                            options: { collectionId: colabsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: [] }
                        },
                        { name: "data_inicio", type: "date", required: true },
                        { name: "data_fim", type: "date" },
                        { name: "custo_gerado", type: "number" }
                    ],
                    ...rules
                }, { headers });
                console.log("✓ Coleção 'time_logs' criada.");
            } catch (e) {
                console.log("Time Logs falhou:", e.response?.data?.message || e.message);
                if (e.response?.data?.data) console.log(JSON.stringify(e.response.data.data, null, 2));
            }
        } else {
            console.log("Skipping time_logs due to missing dependencies IDs");
        }


        console.log("\n✨ Processo Concluído!");

    } catch (e) {
        console.error("ERRO CRÍTICO ADMIN AUTH:", e.message);
    }
}

createDatabase();

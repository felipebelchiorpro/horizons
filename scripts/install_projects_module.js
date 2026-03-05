const PocketBase = require('pocketbase/cjs');

async function installCollections() {
    const pb = new PocketBase('https://backventure.venturexp.pro/');

    try {
        console.log("Autenticando como SuperAdmin...");
        await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
        console.log("Autenticado com sucesso.");

        // Regra de API Pública (permitir leitura/escrita para testes)
        const publicRule = "";

        // 1. Criar Collection Colaboradores
        console.log("Criando coleção 'colaboradores'...");
        try {
            await pb.collections.create({
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
                listRule: publicRule,
                viewRule: publicRule,
                createRule: publicRule,
                updateRule: publicRule,
                deleteRule: publicRule
            });
            console.log("✓ Coleção 'colaboradores' criada.");
        } catch (e) {
            console.log("⚠️ Erro ou coleção 'colaboradores' já existente:", e.message);
        }

        // 2. Criar Collection Projetos
        console.log("\nCriando coleção 'projetos'...");
        try {
            const colabsCollection = await pb.collections.getFirstListItem('name="colaboradores"');

            await pb.collections.create({
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
                        options: { collectionId: colabsCollection.id, cascadeDelete: false, maxSelect: 1 }
                    },
                    { name: "status", type: "select", options: { maxSelect: 1, values: ["Backlog", "Em Andamento", "Pendente", "Concluído"] } },
                    { name: "horas_estimadas", type: "number" }
                ],
                listRule: publicRule,
                viewRule: publicRule,
                createRule: publicRule,
                updateRule: publicRule,
                deleteRule: publicRule
            });
            console.log("✓ Coleção 'projetos' criada.");
        } catch (e) {
            console.log("⚠️ Erro ou coleção 'projetos' já existente:", e.message);
        }

        // 3. Criar Collection Time Logs
        console.log("\nCriando coleção 'time_logs'...");
        try {
            const colabsCollection = await pb.collections.getFirstListItem('name="colaboradores"');
            const projetosCollection = await pb.collections.getFirstListItem('name="projetos"');

            await pb.collections.create({
                name: "time_logs",
                type: "base",
                system: false,
                schema: [
                    {
                        name: "id_projeto",
                        type: "relation",
                        options: { collectionId: projetosCollection.id, cascadeDelete: true, maxSelect: 1 }
                    },
                    {
                        name: "id_colaborador",
                        type: "relation",
                        options: { collectionId: colabsCollection.id, cascadeDelete: false, maxSelect: 1 }
                    },
                    { name: "data_inicio", type: "date", required: true },
                    { name: "data_fim", type: "date" },
                    { name: "custo_gerado", type: "number" }
                ],
                listRule: publicRule,
                viewRule: publicRule,
                createRule: publicRule,
                updateRule: publicRule,
                deleteRule: publicRule
            });
            console.log("✓ Coleção 'time_logs' criada.");
        } catch (e) {
            console.log("⚠️ Erro ou coleção 'time_logs' já existente:", e.message);
        }

        console.log("\n🚀 Instalação concluída!");

    } catch (e) {
        console.error('ERROR FATAL:', e.message);
    }
}

installCollections();

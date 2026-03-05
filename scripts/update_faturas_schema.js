const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://backventure.venturexp.pro/');

async function updateFaturas() {
    await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
    const col = await pb.collections.getOne('faturas');

    const newFields = [
        { name: "documento_cliente", type: "text" },
        { name: "email_cliente", type: "email" },
        { name: "data_emissao", type: "date" },
        { name: "data_vencimento", type: "date" },
        { name: "itens", type: "json" },
        { name: "valor_total", type: "number" },
        { name: "observacoes", type: "text" }
    ];

    let modified = false;
    for (const f of newFields) {
        if (!col.fields.find(cf => cf.name === f.name)) {
            col.fields.push({
                name: f.name,
                type: f.type,
                system: false,
                required: false,
                hidden: false,
                presentable: false
            });
            modified = true;
        }
    }

    if (modified) {
        await pb.collections.update('faturas', col);
        console.log("Collection 'faturas' updated with new fields.");
    } else {
        console.log("Collection 'faturas' already has all fields.");
    }
}
updateFaturas().catch(console.error);

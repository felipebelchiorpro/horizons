const url = 'https://backventure.venturexp.pro/api/collections/clientes/records';
const authUrl = 'https://backventure.venturexp.pro/api/admins/auth-with-password';

async function testCreate() {
    try {
        const authRes = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'contatofelipebelchior@gmail.com',
                password: '@Fe3595157'
            })
        });
        const authData = await authRes.json();
        if (!authRes.ok) {
            console.error('Auth Failed:', authData);
            return;
        }
        const token = authData.token;

        const createRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: "Teste Cliente JS",
                empresa: "Empresa Teste",
                documento: "12345678900",
                responsavel: "Teste Responsável",
                email: "teste@teste.com",
                telefone: "11999999999",
                website: "www.teste.com"
            })
        });
        const createData = await createRes.json();
        console.log('Create Response:', createData);
    } catch (e) {
        console.error('DIAGNOSE ERROR:', e.message);
    }
}
testCreate();

const url = 'https://backventure.venturexp.pro/api/collections';
const authUrl = 'https://backventure.venturexp.pro/api/admins/auth-with-password';

async function diagnose() {
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

        const collsRes = await fetch(url + '?getFullList=true', {
            headers: { 'Authorization': token }
        });
        const collsData = await collsRes.json();
        console.log('COLLECTIONS:', JSON.stringify(collsData.items.map(c => c.name)));
    } catch (e) {
        console.error('DIAGNOSE ERROR:', e.message);
    }
}
diagnose();

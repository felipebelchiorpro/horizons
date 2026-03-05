const url = 'https://backventure.venturexp.pro/api/collections/_superusers/auth-with-password';

async function testSuperuser() {
    try {
        const authRes = await fetch(url, {
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

        console.log("Success! Token:", !!authData.token);
    } catch (e) {
        console.error('DIAGNOSE ERROR:', e.message);
    }
}
testSuperuser();

const PocketBase = require('pocketbase/cjs');

async function check() {
    const pb = new PocketBase('https://backventure.venturexp.pro/');
    try {
        await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
        const collections = await pb.collections.getFullList();
        console.log('COLLECTIONS:', JSON.stringify(collections.map(c => c.name)));
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
check();

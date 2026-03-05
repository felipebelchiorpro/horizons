import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://backventure.venturexp.pro/');

export async function authenticate() {
    if (!pb.authStore.isValid) {
        try {
            const authData = await pb.collection('_superusers').authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
            console.log('PB Authenticated successfully', authData);
        } catch (e: any) {
            console.error('PB Auth Failed!', {
                message: e.message,
                status: e.status,
                data: e.data
            });
            throw e; // Rethrow to handle in page
        }
    }
}

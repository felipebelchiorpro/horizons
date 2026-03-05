import { pb } from "./pocketbase";

interface ChatwootConfig {
    url: string;
    token: string;
    inboxId: string;
}

const getConfig = async (): Promise<ChatwootConfig | null> => {
    try {
        const settings = await pb.collection('settings').getFullList();
        const config: ChatwootConfig = { url: "", token: "", inboxId: "" };

        settings.forEach(s => {
            if (s.key === 'chatwoot_url') config.url = s.value;
            if (s.key === 'chatwoot_token') config.token = s.value;
            if (s.key === 'chatwoot_inbox_id') config.inboxId = s.value;
        });

        if (!config.url || !config.token) return null;
        return config;
    } catch (err) {
        console.error("Error fetching Chatwoot config from PB:", err);
        return null;
    }
};

export async function sendWhatsAppMessage(phone: string, content: string) {
    const config = await getConfig();
    if (!config) {
        console.warn("Chatwoot not configured. Message not sent.");
        return null;
    }

    try {
        // 1. Search or Create Contact
        const contactResponse = await fetch(`${config.url}/api/v1/accounts/1/contacts/search?q=${phone}`, {
            headers: { 'api_access_token': config.token }
        });
        let contact = (await contactResponse.json()).payload[0];

        if (!contact) {
            const createResponse = await fetch(`${config.url}/api/v1/accounts/1/contacts`, {
                method: 'POST',
                headers: {
                    'api_access_token': config.token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: phone, phone_number: phone })
            });
            contact = (await createResponse.json()).payload.contact;
        }

        // 2. Search or Create Conversation (Simplified for MVP)
        const conversationResponse = await fetch(`${config.url}/api/v1/accounts/1/conversations`, {
            method: 'POST',
            headers: {
                'api_access_token': config.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_id: contact.id,
                inbox_id: config.inboxId,
                contact_id: contact.id
            })
        });
        const conversation = await conversationResponse.json();

        // 3. Send Message
        const messageResponse = await fetch(`${config.url}/api/v1/accounts/1/conversations/${conversation.id}/messages`, {
            method: 'POST',
            headers: {
                'api_access_token': config.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content, message_type: 'outgoing' })
        });

        return await messageResponse.json();
    } catch (error) {
        console.error("Chatwoot API Error:", error);
        return null;
    }
}

/**
 * Sends a file (PDF) via WhatsApp
 * Requires a public URL for the file or attachment logic
 */
export async function sendWhatsAppFile(phone: string, fileUrl: string, caption: string) {
    // Note: Most WhatsApp APIs (and Chatwoot) require the file to be sent as an attachment.
    // This is a simplified version using a text message with the link for now.
    const message = `${caption}\n\nDocumento: ${fileUrl}`;
    return sendWhatsAppMessage(phone, message);
}

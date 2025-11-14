// api/submit.js - Vercel Serverless Function

import { Client } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Sadece POST isteklerine izin ver
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Gelen isteği JSON olarak ayrıştır
    const payload = req.body;

    try {
        // Vercel ortam değişkeni KONTROLÜ
        if (!process.env.DATABASE_URL) {
            return res.status(500).json({ 
                error: 'SERVER_CONFIG_ERROR', 
                message: 'DATABASE_URL environment variable is not set.'
            });
        }
        
        // Neon İstemcisini Bağlantı Dizesi ile oluştur
        const client = new Client(process.env.DATABASE_URL);
        await client.connect();
        
        // KRİTİK INSERT İŞLEMİ (Veri Güvenliği için parametreler kullanıldı)
        const query = `
            INSERT INTO public.secrets 
                (nickname, is_public, content, public_key_for_replies, expires_at, pow_nonce, pow_hash, pow_string_base64) 
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id
        `;
        
        // Payload'dan gelen verileri parametre olarak güvenli bir şekilde gönder
        const result = await client.query(query, [
            payload.nickname, 
            payload.is_public, 
            payload.content, 
            JSON.stringify(payload.public_key_for_replies), 
            payload.expires_at, 
            payload.pow_nonce, 
            payload.pow_hash, 
            payload.pow_string_base64
        ]);
        
        await client.end();

        const newId = result.rows[0].id;

        // Başarılı yanıtı döndür
        return res.status(200).json({ id: newId, success: true });

    } catch (error) {
        console.error("Vercel API Error:", error);
        return res.status(500).json({ 
            error: 'INTERNAL_SERVER_ERROR', 
            message: 'Veritabanına veri yazılırken bir sunucu hatası oluştu.'
        });
    }
}

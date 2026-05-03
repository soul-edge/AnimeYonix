const admin = require('firebase-admin');

// 1. Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        })
    });
}
const db = admin.firestore();

// 2. The Extractor Logic
function extractCards(html) {
    const results = [];
    const links = html.split('<a ');
    for (let link of links) {
        const insideLink = link.split('</a>')[0];
        const mangaMatch = insideLink.match(/href="(\/manga\/[^"]+)"/);
        const chapterMatch = insideLink.match(/href="\/chapters\/(\d+)-[^"]+"/);
        if (!mangaMatch && !chapterMatch) continue;
        const imgMatch = insideLink.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
        const titleMatch = insideLink.match(/<img[^>]+(?:alt|title)="([^"]+)"/i);
        if (imgMatch && titleMatch) {
            const thumbnail = imgMatch[1];
            let title = titleMatch[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
            title = title.replace(/^(.+?)(?:\s+\1)+$/, '$1').trim();
            title = title.replace(/\s+Chapter\s+\d+(\.\d+)?$/i, '').trim();
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const id = mangaMatch ? mangaMatch[1] : `/manga/${chapterMatch[1]}/${slug}`;
            const mangaIdNum = id.split('/')[2];
            if (!results.find(r => r.id.includes(`/${mangaIdNum}/`))) {
                results.push({ id, title, thumbnail });
            }
        }
    }
    return results;
}

// 3. The Main Robot Handler
module.exports = async function (req, res) {
    // Simplified Auth for testing
    const auth = req.query.auth || req.headers.authorization;
    if (!auth || !auth.includes("Jaxxsparrow1970")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const headers = { "User-Agent": "Mozilla/5.0" };
        const response = await fetch(`https://mangapill.com/`, { headers });
        const html = await response.text();
        const cards = extractCards(html);

        const cacheData = {
            recent: cards.slice(0, 15),
            trending: cards.slice(15, 30),
            recommended: cards.slice(30, 45),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('server_cache').doc('homepage').set(cacheData);
        return res.status(200).json({ success: true, message: "Database Synced!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

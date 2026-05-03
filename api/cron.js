const admin = require('firebase-admin');

// --- 1. WAKE UP FIREBASE ADMIN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Vercel alters newlines in private keys, this replace() fixes it
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        })
    });
}
const db = admin.firestore();

// --- 2. THE APEX EXTRACTOR ---
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

// --- 3. THE CRON EXECUTION ---
module.exports = async function (req, res) {
    // Security check: Only allow Vercel's automated system to run this script
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36" };

        const res1 = await fetch(`https://mangapill.com/`, { headers });
        const homepageCards = extractCards(await res1.text());
        
        let recent = homepageCards.slice(0, 15);
        let trending = homepageCards.slice(15, 30);

        if (trending.length < 5) {
            const res2 = await fetch(`https://mangapill.com/search?q=demon`, { headers });
            trending = extractCards(await res2.text()).slice(0, 15);
        }

        const res3 = await fetch(`https://mangapill.com/search?q=fantasy`, { headers });
        const recommended = extractCards(await res3.text()).slice(0, 15);

        // Package the payload
        const cacheData = {
            recent,
            trending,
            recommended,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        // Securely write it directly to your Firebase database!
        await db.collection('server_cache').doc('homepage').set(cacheData);

        return res.status(200).json({ success: true, message: "MangaYonix Database Synced Successfully!" });
    } catch (error) {
        console.error("Cron Error:", error);
        return res.status(500).json({ error: error.message });
    }
};

const cheerio = require('cheerio'); 
const admin = require('firebase-admin');

// --- 1. FIREBASE ADMIN SETUP ---
// This gives your Search API the same database VIP pass as your Robot
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

module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId, proxyImage } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://mangapill.com/"
    };

    try {
        // --- 1. THE IMAGE PROXY ---
        if (proxyImage) {
            const response = await fetch(decodeURIComponent(proxyImage), { headers });
            if (!response.ok) throw new Error("Proxy blocked.");
            const buffer = Buffer.from(await response.arrayBuffer());
            res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.status(200).send(buffer);
        }

        // --- 2. SEARCH ENGINE (Live Pass-Through) ---
        else if (q) {
            const response = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(q)}`, { headers });
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            $('a[href^="/manga/"]').each((index, element) => {
                const id = $(element).attr('href');
                const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
                const title = $(element).find('img').attr('alt') || $(element).text().trim();

                if (id && image && title) {
                    if (!results.find(m => m.id === id)) {
                        results.push({ id, title, thumbnail: image });
                    }
                }
            });

            if (results.length === 0) throw new Error("No manga found.");
            return res.status(200).json(results);
        } 

        // --- 3. DETAILS, CHAPTERS, & THE SILENT SAVE ---
        else if (mangaId) {
            const response = await fetch(`https://mangapill.com${decodeURIComponent(mangaId)}`, { headers });
            const html = await response.text();
            const $ = cheerio.load(html);

            const description = $('p.text-sm.text-stone-300').first().text().trim() || "No description available.";
            
            const genres = [];
            $('a[href*="?genre="]').each((i, el) => genres.push($(el).text().trim()));
            
            const chapters = [];
            let maxChapter = 0; // We will use this to find the latest chapter number!

            $('#chapters a[href^="/chapters/"]').each((i, el) => {
                const id = $(el).attr('href');
                const title = $(el).text().trim();
                
                const numMatch = title.match(/(?:Chapter|Ch\.?)\s*(\d+(\.\d+)?)/i) || id.match(/chapter-(\d+(\.\d+)?)/i);
                const chap = numMatch ? parseFloat(numMatch[1]) : i;
                
                if (chap > maxChapter) maxChapter = chap; // Track highest chapter
                
                chapters.push({ id, title, chap });
            });

            // ==========================================
            // THE SILENT SAVE PROTOCOL
            // ==========================================
            const mangaTitle = $('h1').first().text().trim();
            const mangaImage = $('div.container img').first().attr('data-src') || $('img').first().attr('src');
            const safeDocId = decodeURIComponent(mangaId).split('/')[2];

            // If we found the data, save it to Firebase
            if (safeDocId && mangaTitle) {
                const mangaData = {
                    docId: safeDocId,
                    id: decodeURIComponent(mangaId),
                    title: mangaTitle,
                    image: mangaImage || "",
                    latestChapter: maxChapter.toString(), // Save the highest chapter we found
                    updatedAt: admin.firestore.FieldValue.serverTimestamp() // Puts it at the front of your homepage!
                };

                // NOTE: We do NOT put 'await' here. This tells Vercel to save it in the background 
                // so the user doesn't have to wait!
                db.collection('mangas').doc(safeDocId).set(mangaData, { merge: true })
                  .catch(err => console.error("Firebase Silent Save Error:", err));
            }
            // ==========================================

            return res.status(200).json({ 
                details: { description, genres: genres.join(', ') || "Manga" }, 
                chapters 
            });
        }
        
        // --- 4. IMAGE EXTRACTOR (THE READER) ---
        else if (chapterId) {
            const response = await fetch(`https://mangapill.com${decodeURIComponent(chapterId)}`, { headers });
            const html = await response.text();
            const $ = cheerio.load(html);
            const images = [];

            $('picture img').each((i, el) => {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && !src.includes('thumb')) images.push(src);
            });

            if (images.length === 0) throw new Error("Could not extract chapter pages.");
            return res.status(200).json({ images });
        } 
        
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }

    } catch (error) {
        console.error("API Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

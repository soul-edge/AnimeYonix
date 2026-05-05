const cheerio = require('cheerio'); 
const admin = require('firebase-admin');

// --- FIREBASE ADMIN SETUP ---
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
                
                let title = $(element).find('img').attr('alt') || $(element).text().trim();
                // THE ECHO CLEANER
                title = title.replace(/\s+/g, ' ').trim(); 
                title = title.replace(/^(.+?)(?:\s+\1)+$/i, '$1');

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
            let maxChapter = 0; 

            $('#chapters a[href^="/chapters/"]').each((i, el) => {
                const id = $(el).attr('href');
                const title = $(el).text().trim();
                
                const numMatch = title.match(/(?:Chapter|Ch\.?)\s*(\d+(\.\d+)?)/i) || id.match(/chapter-(\d+(\.\d+)?)/i);
                const chap = numMatch ? parseFloat(numMatch[1]) : i;
                
                if (chap > maxChapter) maxChapter = chap; 
                
                chapters.push({ id, title, chap });
            });

            // ==========================================
            // THE SILENT SAVE PROTOCOL
            // ==========================================
            let mangaTitle = $('h1').first().text().trim();
            // Clean the title here just in case the Details page echoes it too
            mangaTitle = mangaTitle.replace(/\s+/g, ' ').trim(); 
            mangaTitle = mangaTitle.replace(/^(.+?)(?:\s+\1)+$/i, '$1');

            const mangaImage = $('div.container img').first().attr('data-src') || $('img').first().attr('src');
            const safeDocId = decodeURIComponent(mangaId).split('/')[2];

            if (safeDocId && mangaTitle) {
                const mangaData = {
                    docId: safeDocId,
                    id: decodeURIComponent(mangaId),
                    title: mangaTitle,
                    image: mangaImage || "",
                    latestChapter: maxChapter.toString(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp() 
                };

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

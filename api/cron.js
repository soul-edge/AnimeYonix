const admin = require('firebase-admin');
const cheerio = require('cheerio'); 

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
    const auth = req.query.auth || req.headers.authorization;
    if (auth !== "Jaxxsparrow1970" && auth !== "Bearer Jaxxsparrow1970") {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const response = await fetch(`https://mangapill.com/`, { 
            headers: { "User-Agent": "Mozilla/5.0" } 
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const scrapedMangas = [];

        $('a[href^="/manga/"]').each((index, element) => {
            const fullLink = $(element).attr('href');   
            const safeDocId = fullLink.split('/')[2];   

            const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
            
            let title = $(element).find('img').attr('alt') || $(element).text().trim();
            // THE ECHO CLEANER
            title = title.replace(/\s+/g, ' ').trim();
            title = title.replace(/^(.+?)(?:\s+\1)+$/i, '$1');

            const chapterLink = $(element).parent().find('a[href*="/chapters/"]').first();
            const chapterText = chapterLink.text().trim();
            const chapterMatch = chapterText.match(/\d+(\.\d+)?/);
            const chapterNumber = chapterMatch ? chapterMatch[0] : "1";

            if (fullLink && title && image) {
                if (!scrapedMangas.find(m => m.docId === safeDocId)) {
                    scrapedMangas.push({
                        docId: safeDocId,      
                        id: fullLink,          
                        title: title,
                        image: image,
                        latestChapter: chapterNumber,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        });

        const batch = db.batch(); 
        const mangasCollection = db.collection('mangas'); 
        const topMangas = scrapedMangas.slice(0, 30);

        topMangas.forEach((manga) => {
            const docRef = mangasCollection.doc(manga.docId);
            batch.set(docRef, manga, { merge: true }); 
        });

        await batch.commit();

        await db.collection('server_cache').doc('status').set({
            robot_status: "Online",
            last_run: admin.firestore.FieldValue.serverTimestamp(),
            mangas_updated: topMangas.length
        });

        return res.status(200).json({ 
            success: true, 
            message: `MangaYonix Robot is Active! Saved ${topMangas.length} mangas to database.` 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

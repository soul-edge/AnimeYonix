const admin = require('firebase-admin');
const cheerio = require('cheerio'); // Give the robot eyes to read HTML

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
        // 1. Fetch the MangaPill homepage HTML
        const response = await fetch(`https://mangapill.com/`, { 
            headers: { "User-Agent": "Mozilla/5.0" } 
        });
        const html = await response.text();

        // 2. Load the HTML into Cheerio so we can search it
        const $ = cheerio.load(html);
        const scrapedMangas = [];

        // 3. The Logic: Find every link on the homepage that goes to a manga
        $('a[href^="/manga/"]').each((index, element) => {
            const link = $(element).attr('href'); // Example: /manga/2/one-piece
            const mangaId = link.split('/')[2];   // Extracts '2'

            // Look inside the link for the cover image and title
            // Note: MangaPill often uses data-src for images to make the site load faster
            const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
            
            // Find the title (usually in an alt tag or a bold div)
            const title = $(element).find('img').attr('alt') || $(element).text().trim();

            // Try to find the latest chapter number nearby
            const latestChapterText = $(element).parent().find('a[href*="/chapter/"]').first().text().trim();
            const chapterNumber = latestChapterText.replace(/[^0-9.]/g, ''); // Strips letters, leaves "1114"

            // If we successfully found a real manga, add it to our list
            if (mangaId && title && image) {
                // Prevent duplicate titles in our temporary list
                if (!scrapedMangas.find(m => m.id === mangaId)) {
                    scrapedMangas.push({
                        id: mangaId,
                        title: title,
                        image: image,
                        latestChapter: chapterNumber || "1",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        });

        // 4. Save the top 30 latest updates to Firebase
        const batch = db.batch(); // We use a "batch" to save them all at once (it's faster)
        const mangasCollection = db.collection('mangas'); // THIS creates your new 'mangas' folder!
        const topMangas = scrapedMangas.slice(0, 30);

        topMangas.forEach((manga) => {
            const docRef = mangasCollection.doc(manga.id);
            // merge: true means "update it if it exists, create it if it's new"
            batch.set(docRef, manga, { merge: true }); 
        });

        // Execute the database save
        await batch.commit();

        // Update your status monitor
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

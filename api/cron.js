const admin = require('firebase-admin');

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
        // Scrape MangaPill
        const response = await fetch(`https://mangapill.com/`, { 
            headers: { "User-Agent": "Mozilla/5.0" } 
        });
        const html = await response.text();

        // Just a quick save to prove it works
        await db.collection('server_cache').doc('status').set({
            robot_status: "Online",
            last_run: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, message: "MangaYonix Robot is Active!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

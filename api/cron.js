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

// --- THE ROBOT HANDLER ---
module.exports = async function (req, res) {
    // Check URL for ?auth=Jaxxsparrow1970
    const secret = req.query.auth || req.headers.authorization;
    if (secret !== "Jaxxsparrow1970" && secret !== "Bearer Jaxxsparrow1970") {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const headers = { "User-Agent": "Mozilla/5.0" };
        const response = await fetch(`https://mangapill.com/`, { headers });
        const html = await response.text();
        
        // (Extractor logic here - keep your existing extractCards function)
        
        await db.collection('server_cache').doc('homepage').set({
            status: "Online",
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, message: "Robot Synced!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

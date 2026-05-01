export default async function handler(req, res) {
    // 1. Tell the browser this server is safe to talk to
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "No search query provided" });

    // 2. Fetch directly from MangaDex as a SERVER, bypassing browser blocks!
    try {
        const targetUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&includes[]=cover_art&limit=12`;
        const response = await fetch(targetUrl);
        
        if (!response.ok) throw new Error("MangaDex rejected the server request");
        
        const data = await response.json();

        // 3. Hand the data back to your frontend website
        res.status(200).json(data);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Failed to fetch from MangaDex" });
    }
}

export default async function handler(req, res) {
    // 1. Set up CORS headers so your frontend is allowed to talk to your backend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. Handle quick security checks
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Grab the search term from your frontend
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: "No search query provided" });
    }

    // 4. The Proxy: Request data from Consumet as a SERVER, not a browser!
    try {
        const targetUrl = `https://api.consumet.org/anime/animepahe/${encodeURIComponent(query)}`;
        
        const response = await fetch(targetUrl);
        const data = await response.json();

        // Send the data back to your website
        res.status(200).json(data);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Failed to fetch from Consumet" });
    }
}

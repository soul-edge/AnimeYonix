export default async function handler(req, res) {
    // 1. Tell the browser this proxy is safe
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { q, mangaHid, chapterId } = req.query;

    try {
        let targetUrl;
        
        if (q) {
            targetUrl = `https://api.comick.app/v1.0/search?q=${encodeURIComponent(q)}&limit=1`;
        } 
        else if (mangaHid) {
            targetUrl = `https://api.comick.app/comic/${mangaHid}/chapters?lang=en&limit=99999`;
        } 
        else if (chapterId) {
            targetUrl = `https://api.comick.app/chapter/${chapterId}`;
        } 
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }

        // 2. THE DISGUISE: Pretend to be a normal Chrome browser on Windows
        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`ComicK blocked us: Error ${response.status}`);
        }
        
        const data = await response.json();
        res.status(200).json(data);
        
    } catch (error) {
        // 3. THE REVEAL: Print the exact crash reason to the screen
        res.status(500).json({ error: error.message });
    }
}

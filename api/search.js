export default async function handler(req, res) {
    // 1. Tell the browser this proxy is safe (Bypasses CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // We look for ComicK's specific parameters now (mangaHid)
    const { q, mangaHid, chapterId } = req.query;

    try {
        let targetUrl;
        
        // 2. Route the requests to ComicK's fast servers
        if (q) {
            // Search for Manga to get the HID
            targetUrl = `https://api.comick.app/v1.0/search?q=${encodeURIComponent(q)}&limit=1`;
        } 
        else if (mangaHid) {
            // Fetch all 99,999 chapters in ONE request (No loops needed!)
            targetUrl = `https://api.comick.app/comic/${mangaHid}/chapters?lang=en&limit=99999`;
        } 
        else if (chapterId) {
            // Fetch the image data for the reader
            targetUrl = `https://api.comick.app/chapter/${chapterId}`;
        } 
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`ComicK rejected the request: ${response.status}`);
        
        const data = await response.json();
        res.status(200).json(data);
        
    } catch (error) {
        res.status(500).json({ error: "Proxy connection failed." });
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // We now accept 'limit' and 'offset' from the frontend
    const { q, mangaId, chapterId, limit = 500, offset = 0 } = req.query;

    try {
        let targetUrl;
        
        if (chapterId) {
            targetUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
        } 
        else if (mangaId) {
            // ALL parameters (Mature content, external URLs, limits) are hardcoded here safely
            targetUrl = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&includeExternalUrl=1`;
        } 
        else {
            targetUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(q)}&limit=1&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
        }

        const response = await fetch(targetUrl);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to reach MangaDex" });
    }
}

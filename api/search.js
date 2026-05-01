export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId } = req.query;

    try {
        let targetUrl;
        // 1. Fetching specific pages for a chapter
        if (chapterId) {
            targetUrl = `https://api.mangadex.org/at-home/server/${chapterId}`;
        }
        // 2. Fetching chapter list for a manga
        else if (mangaId) {
            targetUrl = `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=100`;
        } 
        // 3. Searching for a Manga ID by title
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

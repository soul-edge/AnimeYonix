const cheerio = require('cheerio'); // Import our new HTML reader

module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { q, mangaId, chapterId, proxyImage } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://mangapill.com/"
    };

    try {
        // --- 1. THE IMAGE PROXY (Bypasses Hotlink Protection) ---
        if (proxyImage) {
            const response = await fetch(decodeURIComponent(proxyImage), { headers });
            if (!response.ok) throw new Error("Proxy blocked.");
            const buffer = Buffer.from(await response.arrayBuffer());
            res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.status(200).send(buffer);
        }

        // --- 2. SEARCH ENGINE ---
        if (q) {
            const response = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(q)}`, { headers });
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            // Find all manga links on the search page
            $('a[href^="/manga/"]').each((index, element) => {
                const id = $(element).attr('href');
                const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
                const title = $(element).find('img').attr('alt') || $(element).text().trim();

                // Make sure it's a valid manga and not a duplicate
                if (id && image && title) {
                    if (!results.find(m => m.id === id)) {
                        results.push({ id, title, thumbnail: image });
                    }
                }
            });

            if (results.length === 0) throw new Error("No manga found.");
            return res.status(200).json(results);
        } 

        // --- 3. DETAILS & CHAPTER LIST ---
        else if (mangaId) {
            const response = await fetch(`https://mangapill.com${decodeURIComponent(mangaId)}`, { headers });
            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract Synopsis (usually the first light-grey text block)
            const description = $('p.text-sm.text-stone-300').first().text().trim() || "No description available.";
            
            // Extract Genres
            const genres = [];
            $('a[href*="?genre="]').each((i, el) => genres.push($(el).text().trim()));
            
            // Extract Chapters
            const chapters = [];
            $('#chapters a[href^="/chapters/"]').each((i, el) => {
                const id = $(el).attr('href');
                const title = $(el).text().trim();
                
                // Find the chapter number so we can sort them properly
                const numMatch = title.match(/(?:Chapter|Ch\.?)\s*(\d+(\.\d+)?)/i) || id.match(/chapter-(\d+(\.\d+)?)/i);
                const chap = numMatch ? parseFloat(numMatch[1]) : i;
                
                chapters.push({ id, title, chap });
            });

            return res.status(200).json({ 
                details: { description, genres: genres.join(', ') || "Manga" }, 
                chapters 
            });
        }
        
        // --- 4. IMAGE EXTRACTOR (THE READER) ---
        else if (chapterId) {
            const response = await fetch(`https://mangapill.com${decodeURIComponent(chapterId)}`, { headers });
            const html = await response.text();
            const $ = cheerio.load(html);
            const images = [];

            // Grab every manga page image
            $('picture img').each((i, el) => {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src && !src.includes('thumb')) images.push(src);
            });

            if (images.length === 0) throw new Error("Could not extract chapter pages.");
            return res.status(200).json({ images });
        } 
        
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }

    } catch (error) {
        console.error("API Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId, proxyImage, trending } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://mangapill.com/"
    };

    // --- THE SURGICAL EXTRACTOR ---
    // This guarantees the ID, Thumbnail, and Title are perfectly synced. No more Frankenstein mixed-up mangas!
    function extractCards(html) {
        const results = [];
        const cardRegex = /<a[^>]+href="(\/manga\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"[^>]+(?:alt|title)="([^"]+)"/gi;
        
        let match;
        while ((match = cardRegex.exec(html)) !== null) {
            const id = match[1];
            const thumbnail = match[2];
            let title = match[3].trim();
            
            // Push to results if we haven't already grabbed this exact manga (Prevents duplicates!)
            if (!results.find(r => r.id === id)) {
                results.push({ id, title, thumbnail });
            }
        }
        return results;
    }

    try {
        // --- 1. THE IMAGE PROXY ---
        if (proxyImage) {
            const targetUrl = decodeURIComponent(proxyImage);
            const response = await fetch(targetUrl, { headers });
            if (!response.ok) throw new Error("Proxy blocked.");
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.status(200).send(buffer);
        }
        
        // --- 2. TRENDING HOMEPAGE ---
        else if (trending) {
            const response = await fetch(`https://mangapill.com/`, { headers });
            const html = await response.text();
            
            // Extract perfectly matched cards and only send the top 12 to your homepage
            const results = extractCards(html).slice(0, 12);
            return res.status(200).json(results);
        }

        // --- 3. SEARCH ---
        else if (q) {
            const response = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(q)}`, { headers });
            const html = await response.text();
            
            // Extract perfectly matched cards from search results
            const results = extractCards(html);
            if (results.length === 0) throw new Error("No manga found.");
            return res.status(200).json(results);
        } 
        
        // --- 4. DETAILS & CHAPTERS ---
        else if (mangaId) {
            const targetUrl = `https://mangapill.com${decodeURIComponent(mangaId)}`;
            const response = await fetch(targetUrl, { headers });
            const html = await response.text();

            // Extract Metadata Safely
            const descMatch = html.match(/<p[^>]*class="[^"]*text-sm[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
            const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : "No description available.";
            
            const genreMatches = [...html.matchAll(/href="\/search\?genre=[^"]+"[^>]*>([^<]+)<\/a>/g)];
            const genres = genreMatches.map(m => m[1]).join(', ') || "Manga";

            // Extract Chapters Safely using Regex
            const chapters = [];
            const chapRegex = /<a[^>]+href="(\/chapters\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            let cMatch;
            
            while ((cMatch = chapRegex.exec(html)) !== null) {
                const id = cMatch[1];
                const rawTitle = cMatch[2].replace(/<[^>]+>/g, '').trim(); 
                
                // Extract chapter number mathematically for perfect sorting
                const numMatch = rawTitle.match(/(?:Chapter|Ch\.?)\s*(\d+(\.\d+)?)/i) || id.match(/chapter-(\d+(\.\d+)?)/i);
                const chapNum = numMatch ? parseFloat(numMatch[1]) : 0;
                
                if (!chapters.find(c => c.id === id)) {
                    chapters.push({ id, title: rawTitle, chap: chapNum });
                }
            }
            if (chapters.length === 0) throw new Error("No chapters found.");
            
            return res.status(200).json({ details: { description, genres }, chapters });
        }
        
        // --- 5. IMAGE PAGES ---
        else if (chapterId) {
            const targetUrl = `https://mangapill.com${decodeURIComponent(chapterId)}`;
            const response = await fetch(targetUrl, { headers });
            const html = await response.text();

            const images = [];
            const pictureBlocks = html.split('<picture');

            for (let i = 1; i < pictureBlocks.length; i++) {
                const block = pictureBlocks[i];
                const srcMatch = block.match(/(?:data-src|src)="([^"]+)"/i);
                if (srcMatch && !srcMatch[1].includes('thumb')) {
                    if (!images.includes(srcMatch[1])) images.push(srcMatch[1]);
                }
            }
            if (images.length === 0) throw new Error("Image Scraper failed.");
            return res.status(200).json({ images });
        }
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

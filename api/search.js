module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId, proxyImage, trending } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://mangapill.com/"
    };

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
            
            const results = [];
            const blocks = html.split('href="/manga/');
            
            // Scrape the first 12 hot updates
            for (let i = 1; i < Math.min(blocks.length, 15); i++) {
                const block = blocks[i];
                const idMatch = block.match(/^([^"]+)"/);
                const titleMatch = block.match(/alt="([^"]+)"/) || block.match(/title="([^"]+)"/);
                const imgMatch = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/);
                
                if (idMatch && titleMatch && imgMatch) {
                    const id = '/manga/' + idMatch[1];
                    results.push({ id, title: titleMatch[1], thumbnail: imgMatch[1] });
                }
            }
            return res.status(200).json(results);
        }

        // --- 3. SEARCH ---
        else if (q) {
            const response = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(q)}`, { headers });
            const html = await response.text();

            const results = [];
            const blocks = html.split('href="/manga/');
            
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const idMatch = block.match(/^([^"]+)"/);
                const titleMatch = block.match(/alt="([^"]+)"/) || block.match(/title="([^"]+)"/);
                const imgMatch = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/);
                
                if (idMatch && titleMatch && imgMatch) {
                    const id = '/manga/' + idMatch[1];
                    if (!results.find(r => r.id === id)) results.push({ id, title: titleMatch[1], thumbnail: imgMatch[1] });
                }
            }
            if (results.length === 0) throw new Error("No manga found.");
            return res.status(200).json(results);
        } 
        
        // --- 4. DETAILS & CHAPTERS ---
        else if (mangaId) {
            const targetUrl = `https://mangapill.com${decodeURIComponent(mangaId)}`;
            const response = await fetch(targetUrl, { headers });
            const html = await response.text();

            // Extract Metadata
            const descMatch = html.match(/<p class="text-sm text-secondary[^>]*>([\s\S]*?)<\/p>/);
            const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : "No description available.";
            
            const genreMatches = [...html.matchAll(/href="\/search\?genre=[^"]+"[^>]*>([^<]+)<\/a>/g)];
            const genres = genreMatches.map(m => m[1]).join(', ') || "Manga";

            // Extract Chapters
            const chapters = [];
            const blocks = html.split('href="/chapters/');
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const idMatch = block.match(/^([^"]+)"/);
                const titleMatch = block.match(/>([^<]+)<\/a>/);
                
                if (idMatch && titleMatch) {
                    const id = '/chapters/' + idMatch[1];
                    const title = titleMatch[1].trim();
                    const numMatch = title.match(/(\d+(\.\d+)?)/);
                    const chapNum = numMatch ? parseFloat(numMatch[1]) : 0;
                    
                    if (!chapters.find(c => c.id === id)) {
                        chapters.push({ id, title, chap: chapNum });
                    }
                }
            }
            if (chapters.length === 0) throw new Error("No chapters found.");
            
            // Return everything as one neat package
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
                if (srcMatch) {
                    const url = srcMatch[1];
                    if (!images.includes(url)) images.push(url);
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

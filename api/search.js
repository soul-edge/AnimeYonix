module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"
    };

    try {
        if (q) {
            // 1. SEARCH MANGAPILL
            const response = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(q)}`, { headers });
            const html = await response.text();

            if (html.includes("Cloudflare")) throw new Error("Cloudflare blocked Vercel.");

            const results = [];
            const blocks = html.split('href="/manga/');
            
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const idMatch = block.match(/^([^"]+)"/);
                const titleMatch = block.match(/<img[^>]+alt="([^"]+)"/);
                
                if (idMatch && titleMatch) {
                    const id = encodeURIComponent('/manga/' + idMatch[1]);
                    const title = titleMatch[1];
                    if (!results.find(r => r.id === id)) results.push({ id, title });
                }
            }

            if (results.length === 0) throw new Error("No manga found.");
            return res.status(200).json(results);
        } 
        else if (mangaId) {
            // 2. SCRAPE CHAPTERS
            const targetUrl = `https://mangapill.com${decodeURIComponent(mangaId)}`;
            const response = await fetch(targetUrl, { headers });
            const html = await response.text();

            const chapters = [];
            const blocks = html.split('href="/chapters/');
            
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const idMatch = block.match(/^([^"]+)"/);
                const titleMatch = block.match(/>([^<]+)<\/a>/);
                
                if (idMatch && titleMatch) {
                    const id = encodeURIComponent('/chapters/' + idMatch[1]);
                    const title = titleMatch[1].trim();
                    const numMatch = title.match(/(\d+(\.\d+)?)/);
                    const chapNum = numMatch ? parseFloat(numMatch[1]) : 0;
                    
                    if (!chapters.find(c => c.id === id)) {
                        chapters.push({ id, title, chap: chapNum });
                    }
                }
            }

            if (chapters.length === 0) throw new Error("No chapters found.");
            return res.status(200).json(chapters);
        }
        else if (chapterId) {
            // 3. INDESTRUCTIBLE IMAGE SCRAPER
            const targetUrl = `https://mangapill.com${decodeURIComponent(chapterId)}`;
            const response = await fetch(targetUrl, { headers });
            const html = await response.text();

            const images = [];
            const imgTags = [...html.matchAll(/<img[^>]+>/gi)];
            
            for (let tag of imgTags) {
                const srcMatch = tag[0].match(/(?:src|data-src)="([^"]+)"/i);
                if (srcMatch) {
                    const url = srcMatch[1];
                    if (url.includes('http') && !url.includes('logo') && !url.includes('icon') && !url.includes('avatar')) {
                        if (!images.includes(url)) images.push(url);
                    }
                }
            }

            if (images.length === 0) throw new Error("Image Scraper failed: Could not find manga pages.");
            return res.status(200).json({ images });
        }
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { q, mangaId, chapterId, proxyImage, trending, live } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://mangapill.com/"
    };

    // --- THE UPGRADED STRICT EXTRACTOR ---
    function extractCards(html) {
        const results = [];
        // Break the HTML into isolated anchor tag blocks
        const links = html.split('<a ');

        for (let link of links) {
            // Isolate ONLY what is inside this specific link to prevent bleeding
            const insideLink = link.split('</a>')[0];

            // 1. Must be a base manga link, ignore /chapters/ links
            const hrefMatch = insideLink.match(/href="(\/manga\/[^"]+)"/);
            if (!hrefMatch) continue;

            const id = hrefMatch[1];

            // 2. Find the image strictly inside this isolated block
            const imgMatch = insideLink.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
            const titleMatch = insideLink.match(/<img[^>]+(?:alt|title)="([^"]+)"/i);

            if (imgMatch && titleMatch) {
                const thumbnail = imgMatch[1];
                let title = titleMatch[1]
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .trim();

                // Clean up: Remove "Chapter X" from titles if MangaPill added it to the image alt text
                title = title.replace(/\s+Chapter\s+\d+(\.\d+)?$/i, '').trim();

                // Save it!
                if (!results.find(r => r.id === id)) {
                    results.push({ id, title, thumbnail });
                }
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
        
        // --- 2. NEW: REAL-TIME HOMEPAGE SCRAPER ---
        else if (live === 'true') {
            const response = await fetch(`https://mangapill.com/`, { headers });
            const html = await response.text();
            
            const liveMangaList = extractCards(html);

            return res.status(200).json({
                recent: liveMangaList.slice(0, 15),
                trending: liveMangaList.slice(15, 30),
                recommended: liveMangaList.slice(30, 45)
            });
        }

        // --- 3. TRENDING HOMEPAGE (STATIC FALLBACK) ---
        else if (trending) {
            let response = await fetch(`https://mangapill.com/manga`, { headers });
            let html = await response.text();
            let results = extractCards(html);

            if (results.length === 0) {
                response = await fetch(`https://mangapill.com/search?q=the`, { headers });
                html = await response.text();
                results = extractCards(html);
            }

            return res.status(200).json(results.slice(0, 12));
        }

        // --- 4. SEARCH ---
        else if (q) {
            const response = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(q)}`, { headers });
            const html = await response.text();
            
            const results = extractCards(html);
            if (results.length === 0) throw new Error("No manga found.");
            return res.status(200).json(results);
        } 
        
        // --- 5. DETAILS & CHAPTERS ---
        else if (mangaId) {
            const targetUrl = `https://mangapill.com${decodeURIComponent(mangaId)}`;
            const response = await fetch(targetUrl, { headers });
            const html = await response.text();

            const descMatch = html.match(/<p[^>]*class="[^"]*text-sm[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
            const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : "No description available.";
            
            const genreMatches = [...html.matchAll(/href="\/search\?genre=[^"]+"[^>]*>([^<]+)<\/a>/g)];
            const genres = genreMatches.map(m => m[1]).join(', ') || "Manga";

            const chapters = [];
            const chapBlocks = html.split('href="/chapters/');
            
            for (let i = 1; i < chapBlocks.length; i++) {
                const block = chapBlocks[i];
                const idMatch = block.match(/^([^"]+)"/);
                const titleMatch = block.match(/>([^<]+)<\/a>/);
                
                if (idMatch && titleMatch) {
                    const id = '/chapters/' + idMatch[1];
                    const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim(); 
                    
                    const numMatch = rawTitle.match(/(?:Chapter|Ch\.?)\s*(\d+(\.\d+)?)/i) || id.match(/chapter-(\d+(\.\d+)?)/i);
                    const chapNum = numMatch ? parseFloat(numMatch[1]) : 0;
                    
                    if (!chapters.find(c => c.id === id)) {
                        chapters.push({ id, title: rawTitle, chap: chapNum });
                    }
                }
            }
            if (chapters.length === 0) throw new Error("No chapters found.");
            return res.status(200).json({ details: { description, genres }, chapters });
        }
        
        // --- 6. IMAGE PAGES ---
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

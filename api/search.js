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
        const links = html.split('<a ');

        for (let link of links) {
            const insideLink = link.split('</a>')[0];
            const hrefMatch = insideLink.match(/href="(\/manga\/[^"]+)"/);
            if (!hrefMatch) continue;

            const id = hrefMatch[1];
            const imgMatch = insideLink.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
            const titleMatch = insideLink.match(/<img[^>]+(?:alt|title)="([^"]+)"/i);

            if (imgMatch && titleMatch) {
                const thumbnail = imgMatch[1];
                let title = titleMatch[1]
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .trim();

                // 1. YOUR MAGIC DE-DUPLICATOR IS BACK! (Fixes "Berserk Berserk")
                title = title.replace(/^(.+?)(?:\s+\1)+$/, '$1').trim();
                
                // 2. Clean up "Chapter X" from titles
                title = title.replace(/\s+Chapter\s+\d+(\.\d+)?$/i, '').trim();

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
        
        // --- 2. NEW: REAL-TIME HOMEPAGE SCRAPER (FIXED GRID POPULATION) ---
        else if (live === 'true') {
            // Grid 1: Fetch the actual homepage for Recent Updates
            const res1 = await fetch(`https://mangapill.com/`, { headers });
            const html1 = await res1.text();
            const recent = extractCards(html1).slice(0, 15);

            // Grid 2: Fetch the popular directory for Top Trending
            const res2 = await fetch(`https://mangapill.com/manga`, { headers });
            const html2 = await res2.text();
            const trending = extractCards(html2).slice(0, 15);

            // Grid 3: Fetch an action search for Recommendations
            const res3 = await fetch(`https://mangapill.com/search?q=action`, { headers });
            const html3 = await res3.text();
            const recommended = extractCards(html3).slice(0, 15);

            // Send all 3 full arrays back to the frontend!
            return res.status(200).json({ recent, trending, recommended });
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

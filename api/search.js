export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId } = req.query;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://manganato.com/"
    };

    try {
        // --- 1. SEARCH SCRAPER ---
        if (q) {
            const searchTerm = q.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const response = await fetch(`https://manganato.com/search/story/${searchTerm}`, { headers });
            const html = await response.text();

            if (html.includes("Just a moment...") || html.includes("Cloudflare")) {
                throw new Error("Cloudflare Firewall blocked Vercel's IP.");
            }

            const results = [];
            const blocks = html.split('<a '); // Slice the website by links
            
            for (let block of blocks) {
                // If the link goes to a manga...
                if (block.includes('href="') && block.includes('manga-')) {
                    const hrefMatch = block.match(/href="([^"]+manga-[^"]+)"/);
                    const titleMatch = block.match(/title="([^"]+)"/);
                    
                    if (hrefMatch && titleMatch) {
                        const id = hrefMatch[1].split('/').pop(); // Grab "manga-xx1234"
                        const title = titleMatch[1];
                        
                        // Save it (and prevent duplicates)
                        if (id.startsWith('manga-') && !results.find(r => r.id === id)) {
                            results.push({ id, title });
                        }
                    }
                }
            }

            if (results.length === 0) throw new Error("Scraper failed: Manganato blocked the search query.");
            return res.status(200).json(results);
        } 
        
        // --- 2. CHAPTER SCRAPER ---
        else if (mangaId) {
            let response = await fetch(`https://chapmanganato.to/${mangaId}`, { headers });
            let html = await response.text();
            
            if (html.includes("404 - PAGE NOT FOUND") || html.includes("404 Not Found")) {
               response = await fetch(`https://manganato.com/${mangaId}`, { headers });
               html = await response.text();
            }

            if (html.includes("Just a moment...") || html.includes("Cloudflare")) {
                throw new Error("Cloudflare Firewall blocked Vercel's IP.");
            }

            const chapters = [];
            const blocks = html.split('<a '); // Slice the website by links
            
            for (let block of blocks) {
                // If the link goes to a chapter...
                if (block.includes('href="') && block.includes('chapter-')) {
                    const hrefMatch = block.match(/href="([^"]+chapter-[^"]+)"/);
                    const titleMatch = block.match(/title="([^"]+)"/);
                    
                    if (hrefMatch && titleMatch) {
                        const fullLink = hrefMatch[1];
                        const cId = fullLink.split('/').slice(-2).join('/'); // "manga-xx/chapter-1"
                        const cTitle = titleMatch[1];
                        
                        // Find the chapter number for sorting
                        const numMatch = cTitle.match(/Chapter (\d+(\.\d+)?)/i) || fullLink.match(/chapter-(\d+(\.\d+)?)/i);
                        const cNum = numMatch ? parseFloat(numMatch[1]) : 0;
                        
                        if (!chapters.find(c => c.id === cId)) {
                            chapters.push({ id: cId, title: cTitle, chap: cNum });
                        }
                    }
                }
            }

            if (chapters.length === 0) throw new Error("Scraper found no chapters. Layout changed.");
            return res.status(200).json(chapters);
        }
        
        // --- 3. IMAGE SCRAPER ---
        else if (chapterId) {
            const response = await fetch(`https://chapmanganato.to/${chapterId}`, { headers });
            const html = await response.text();
            
            if (html.includes("Just a moment...")) throw new Error("Cloudflare blocked image scraping.");

            // Find the container holding the images
            const readerSection = html.split('container-chapter-reader')[1] || html.split('panel-read-story')[1] || html;

            const images = [];
            const blocks = readerSection.split('<img '); // Slice by image tags
            
            for (let block of blocks) {
                if (block.includes('src="')) {
                    const srcMatch = block.match(/src="([^"]+)"/);
                    // Filter out UI icons and logos, keep only manga pages
                    if (srcMatch && !srcMatch[1].includes('logo') && !srcMatch[1].includes('icon')) {
                        images.push(srcMatch[1]);
                    }
                }
            }
            
            if (images.length === 0) throw new Error("Could not extract image links.");
            return res.status(200).json({ images });
        }
        
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

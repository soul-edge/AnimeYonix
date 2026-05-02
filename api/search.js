export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId } = req.query;

    // Disguise: Upgraded headers to look exactly like a real user clicking a link
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    };

    try {
        if (q) {
            const searchTerm = q.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const response = await fetch(`https://manganato.com/search/story/${searchTerm}`, { headers });
            const html = await response.text();

            // 1. THE DETECTOR: Did Cloudflare catch us?
            if (html.includes("Just a moment...") || response.status === 403) {
                throw new Error("Cloudflare Firewall blocked Vercel's IP.");
            }

            // 2. SMART REGEX: Looks for 'item-title' anywhere inside the class string
            const matches = [...html.matchAll(/<a[^>]+class="[^"]*item-title[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
            const results = matches.map(m => ({
                id: m[1].split('/').pop(),
                title: m[2].replace(/<[^>]+>/g, '') // Strips out any weird HTML tags inside the title
            }));

            if (results.length === 0) throw new Error("Regex found no titles. Manganato changed their HTML layout.");

            return res.status(200).json(results);
        } 
        else if (mangaId) {
            let response = await fetch(`https://chapmanganato.to/${mangaId}`, { headers });
            let html = await response.text();
            
            if (html.includes("404 - PAGE NOT FOUND")) {
               response = await fetch(`https://manganato.com/${mangaId}`, { headers });
               html = await response.text();
            }

            if (html.includes("Just a moment...") || response.status === 403) {
                throw new Error("Cloudflare Firewall blocked Vercel's IP.");
            }

            // SMART REGEX: Looks for 'chapter-name' anywhere inside the class
            const matches = [...html.matchAll(/<a[^>]+class="[^"]*chapter-name[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
            const chapters = matches.map(m => {
                const fullLink = m[1];
                const cId = fullLink.split('/').slice(-2).join('/'); 
                const cTitle = m[2]; 
                
                const numMatch = cTitle.match(/Chapter (\d+(\.\d+)?)/i);
                const cNum = numMatch ? parseFloat(numMatch[1]) : 0;
                
                return { id: cId, title: cTitle, chap: cNum };
            });

            if (chapters.length === 0) throw new Error("Regex found no chapters. Layout changed.");

            return res.status(200).json(chapters);
        }
        else if (chapterId) {
            const response = await fetch(`https://chapmanganato.to/${chapterId}`, { headers });
            const html = await response.text();
            
            if (html.includes("Just a moment...")) throw new Error("Cloudflare blocked image scraping.");

            const readerSection = html.split('container-chapter-reader')[1];
            if (!readerSection) throw new Error("Could not find the image container on the page.");

            const imageMatches = [...readerSection.matchAll(/<img[^>]+src="([^"]+)"/gi)];
            const images = imageMatches.map(m => m[1]);

            return res.status(200).json({ images });
        }
        else {
            return res.status(400).json({ error: "Missing parameters" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

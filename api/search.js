export default async function handler(req, res) {
    // Tell the browser this data is safe
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { q, mangaId, chapterId } = req.query;

    // THE DISGUISE: We tell Manganato we are a human using Chrome on Windows
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    };

    try {
        if (q) {
            // 1. SEARCH: Scrape the Manganato search page
            // Manganato uses underscores instead of spaces (e.g., "one_piece")
            const searchTerm = q.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const response = await fetch(`https://manganato.com/search/story/${searchTerm}`, { headers });
            const html = await response.text();
            
            // Regex to cut out the manga title and the secret ID link
            const matches = [...html.matchAll(/<a[^>]+class="item-title"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
            const results = matches.map(m => {
                return { id: m[1].split('/').pop(), title: m[2] }; // Gets "manga-aa1234"
            });
            return res.status(200).json(results);
        } 
        else if (mangaId) {
            // 2. CHAPTERS: Scrape the manga's homepage
            let response = await fetch(`https://chapmanganato.to/${mangaId}`, { headers });
            let html = await response.text();
            
            // Fallback just in case Manganato changed their subdomain routing
            if (html.includes("404 - PAGE NOT FOUND")) {
               response = await fetch(`https://manganato.com/${mangaId}`, { headers });
               html = await response.text();
            }

            // Regex to cut out every single chapter link
            const matches = [...html.matchAll(/<a[^>]+class="chapter-name[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
            const chapters = matches.map(m => {
                const fullLink = m[1];
                const cId = fullLink.split('/').slice(-2).join('/'); // Gets "manga-aa1234/chapter-1"
                const cTitle = m[2]; // Gets "Chapter 1: Romance Dawn"
                
                // Extract just the number so we can mathematically sort it later
                const numMatch = cTitle.match(/Chapter (\d+(\.\d+)?)/i);
                const cNum = numMatch ? parseFloat(numMatch[1]) : 0;
                
                return { id: cId, title: cTitle, chap: cNum };
            });
            return res.status(200).json(chapters);
        }
        else if (chapterId) {
            // 3. IMAGES: Scrape the actual reading page
            const response = await fetch(`https://chapmanganato.to/${chapterId}`, { headers });
            const html = await response.text();
            
            // Cut the page in half, only keep the section with the images
            const readerSection = html.split('container-chapter-reader')[1];
            if (!readerSection) throw new Error("Could not find images on page");

            // Regex to extract the raw JPG links
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

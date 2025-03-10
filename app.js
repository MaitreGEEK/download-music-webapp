import { serve } from "bun";
import { downloadSongs, GM_API_URL, GM_TOKEN } from "./functions";

const server = serve({
    port: 3000,
    routes: {
        "/*": new Response(await Bun.file("./main.html").bytes(), { headers: { "Content-Type": "text/html" } }),
        "/downloads": {
            POST: async req => handleDownloadRequest(req),
        },
        "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
        // Serve a file by buffering it in memory
    "/favicon.ico": new Response(await Bun.file("./favicon.ico").bytes(), {
        headers: {
          "Content-Type": "image/x-icon",
        },
      }),
      "/styles.css": new Response(await Bun.file("./styles.css").bytes(), {
        headers: {
            "Content-Type": 'text/css',
        },
    }),
    },
});

async function handleDownloadRequest(req) {
    try {
        let { searchList } = await req.json();
        if (!Array.isArray(searchList) || searchList.length === 0) {
            return new Response(JSON.stringify({ error: "Liste invalide" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        
        console.log(searchList)
        searchList = searchList.map(s => encodeURIComponent(s))
// Crée la chaîne de paramètres pour l'URL avec un tableau sous le format searchList[]=value1&searchList[]=value2
let searchListParam = searchList.map(s => `searchList[]=${s}`).join('&');

// Effectue la requête GET avec le tableau de recherche dans l'URL
let geekMusicResponse = await fetch(`${GM_API_URL}getSongs?${searchListParam}`, {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GM_TOKEN}`
    }
});
        if (!geekMusicResponse.ok) return new Response(JSON.stringify({error: "Internal Server Error", success:false}, {status: 500, headers: { "Content-Type": "application/json" } }))

        let songs = (await geekMusicResponse.json())?.songs;

        if (!songs) return new Response(JSON.stringify({error: "No Songs Found", success:false}, {status: 404, headers: { "Content-Type": "application/json" } }))

        // Download them on the server
        let downloadResponse = await downloadSongs(songs)

        if (!downloadResponse) return new Response(JSON.stringify({error: "No Songs Downloaded", success:false}, {status: 404, headers: { "Content-Type": "application/json" } }))

        return new Response(JSON.stringify({ success: true, songs: downloadResponse }), { headers: { "Content-Type": "application/json" } });
    } catch (error) {
        promisifiedError("Error while getting songs on api", error)
        return new Response(JSON.stringify({ error: "Internal Server Error", success:false }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

console.log("Server's working on port", server.port)
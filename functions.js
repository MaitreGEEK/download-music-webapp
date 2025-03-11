const GM_TOKEN = "EyRnJOVlpOVm1oV1lUSm9jRlZxU2pSalJsWnhVVzFHYTFa"
const GM_API_URL = "https://geekmusic-api.m336.dev/api/"//https://geekmusic-api.m336.dev/api/"
const SAVE_PATH = "./saves"
const COBALT_URL = "https://cobalt-list.maitregeek.eu/"
const COBALT_TOKEN = "MxcEljRTlXYkhCWVdWUk9kMkZHU2xWaVNFNWFWa1Z2ZDFSc1dsWmxiVTVHVkcxc1RtSkZXVEZXVkVadlpERlplVkp1U2xSaVZWcFlXVmQwWVdGR2JIRlNiazVxVm1zMU1GVnRNVEJW"

//COBALT

const trialsLimit = 5
const trialsCd = 60_000
var cobaltTrials = { number: 0, last: 0 }

async function getCobalt(best = false) {
    if (cobaltTrials.number >= trialsLimit && cobaltTrials.last + trialsCd > Date.now()) return null
    else if (cobaltTrials.last + trialsCd <= Date.now()) cobaltTrials = { number: 0, last: 0 }

    cobaltTrials.number += 1
    cobaltTrials.last = Date.now()

    let response = await fetch(COBALT_URL + "getOne?clean=true" + (best ? "&wantBest=true" : ""), { headers: { "Authorization": "Bearer " + COBALT_TOKEN } })

    if (!response.ok) return null

    let newCobaltInstance;
    try {
        newCobaltInstance = await response.json()
        if (newCobaltInstance?.url) {
            cobaltTrials = { number: 0, last: 0 }

            return newCobaltInstance
        }
        else return null
    }
    catch (e) {
        promisifiedError("Error while json'ing the cobalt list response", e)
        return null
    }
}


/*(async () => {
    console.log("test", await getYoutubeSongDownloadLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))

    setInterval(async () => {
        console.log("test2", await getYoutubeSongDownloadLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))

    }, 10000);
})();*/


var cobaltInstance;
const notCobaltErrors = ["error.api.content.video.live", "error.api.link.invalid", "error.api.content.video.unavailable"]
async function getYoutubeSongDownloadLink(youtubeUrl) {
    try {
        // Si aucune instance n'est définie, essayer d'en obtenir une
        if (!cobaltInstance) {
            cobaltInstance = await getCobalt(true);
            if (!cobaltInstance) return null;
        }

        // Options de la requête
        let response = await fetch(cobaltInstance.url, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "Authorization": cobaltInstance.apikey || ""
            },
            body: JSON.stringify({
                url: youtubeUrl,
                downloadMode: 'audio',
                audioFormat: 'best',
                audioBitrate: '320',
            }),
        });

        if (!response.ok) return await moveToNewCobaltInstance(youtubeUrl)

        let responseData;
        try { responseData = await response.json() } catch { };

        if (!responseData) return await moveToNewCobaltInstance(youtubeUrl)

        if (response.status < 400) return responseData.url
        else if (responseData.error) {
            if (!notCobaltErrors.includes(responseData.error?.code)) return await moveToNewCobaltInstance(youtubeUrl)
            else return null
        }
        else {
            return await moveToNewCobaltInstance(youtubeUrl)
        }
    } catch (error) {
        if (!(error?.name == "SyntaxError" || error?.name === 'AbortError' || error?.code == 'ConnectionRefused' || (error?.message || "").includes('timeout'))) promisifiedError('Cobalt request failed:', error);

        return await moveToNewCobaltInstance(youtubeUrl)
    }
}

async function moveToNewCobaltInstance(youtubeUrl) {
    cobaltInstance = await getCobalt(true);
    return cobaltInstance ? await getYoutubeSongDownloadLink(youtubeUrl) : null;
}

// GET DOWNLOAD URL

async function handleGeometryDashStream(songUrl) {
    let songId = songUrl.match(geometryDash)[1]

    if (songId) {
        try {
            let response = await fetch(`${GM_API_URL}getSongFromGD/?songId=${songId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${GM_TOKEN}`, // Ajout du Bearer Token
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                return await response.blob(); // Retourne le fichier à télécharger
            } else {
                return songUrl;
            }
        } catch (e) {
            promisifiedError("Download Song Error", e);
            return songUrl;
        }

    }
    else return songUrl
}

const youtubeTrackPattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/(watch\?v=)?)([^#\&\?]{11})/;
const geometryDash = /^https?:\/\/geometrydashfiles\.b-cdn\.net\/music\/(\d{7,})\.ogg$/i;
const testIsLink = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?[^\s]*$/i;
async function getSongURL(songUrl) {
    if (!songUrl) return null

    return new Promise(async (resolve) => {
        let stream
        //Get the song stream
        try {
            if (youtubeTrackPattern.test(songUrl)) {
                stream = await getYoutubeSongDownloadLink(songUrl)
            }
            else if (songUrl.match(geometryDash)) stream = await handleGeometryDashStream(songUrl)
            else stream = songUrl;


            console.log("steam", stream)

            if (!stream) resolve(null)
            else {
                if (testIsLink.test(stream)) {
                    try {
                        new URL(stream);

                        let response = await fetch(stream);

                        if (response.ok && response.body) {
                            resolve(response.body);
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        promisifiedError("Get Link Stream Error", e);
                        resolve(null);
                    }
                } else {
                    resolve(stream);
                }
            }
        } catch (error) {
            promisifiedError("Create Song Ressource Error: ", error)
            resolve(null)
        }
    })
}

// SAVE FUNCTION
async function saveSong(download, title) {
    try {
        if (!title) title = generateFileName()
        else title = title.replace(/[^a-zA-Z0-9_-]/g, '_');
        let response = new Response(download)
        // Récupère les données du stream (lecture du stream)
        let buffer = await response.arrayBuffer();

        // Écrit les données dans un fichier avec Bun
        await Bun.write(`${SAVE_PATH}/${title}.mp3`, new Uint8Array(buffer));
        return true
    }
    catch (e) {
        promisifiedError("Error while saving song", e)
        return false
    }
}

function generateFileName() {
    // Obtenir le timestamp actuel (en millisecondes)
    let timestamp = Date.now();

    // Générer une chaîne aléatoire de 8 caractères pour plus d'unicité
    let randomString = Math.random().toString(36).substring(2, 10);

    // Créer le nom du fichier avec le timestamp et la chaîne aléatoire
    let fileName = `${timestamp}_${randomString}${title ? `_${title}` : ''}.mp3`;

    return fileName

}

// 

async function downloadSongs(songs) {
    if (!songs) return false

    return (await Promise.all(songs.map(async song => {
        if (!song?.url) return { ...song, success: false }
        song.download = await getSongURL(song.url)
        if (!song.download) return { ...song, success: false }
        song.success = await saveSong(song.download, song.title)
        return song
    })))
}

//Logs
async function promisifiedLog(...args) {
    return new Promise(async (resolve) => {
        console.log(await date(), ...args);
        resolve();
    });
}

async function promisifiedError(...args) {
    return new Promise(async (resolve) => {
        console.error(await date(), ...args);
        resolve();
    });
}

async function date() {
    let d = new Date();
    let pad = num => num.toString().padStart(2, '0');

    let date = `${d.getFullYear()}-${pad(d.getDate())}-${pad(d.getMonth() + 1)}`;
    let time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    let fullDate = `[${date}||${time}]`;

    return fullDate;
}


module.exports = {
    downloadSongs,
    promisifiedError,
    GM_TOKEN,
    GM_API_URL
}
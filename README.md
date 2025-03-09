# download-music-webapp
Download songs lists from various sources for a NAS

## Routes

/ main page où on peut entrer une liste de liens et titres et facilement les envoyer download

POST /downloads avec body permettant d'envoyer la liste de liens. Envoie la liste à l'API de GEEK Music. Download via cobalt ou autres sources.
# download-music-webapp
Download songs lists from various sources for a NAS

## Routes

/ main page où on peut entrer une liste de liens et titres et facilement les envoyer download
Fait une page HTML pour entrer un texte (c'est la partie principale) où on peut voir les dénombrement des lignes où chaque ligne = une musique soit sous forme de lien soit sous forme de titre

POST /downloads avec body permettant d'envoyer la liste de liens. Envoie la liste à l'API de GEEK Music. Download via cobalt ou autres sources.

## Fonctionnement
On fetch https://geekmusic-api.m336.dev/getSongs avec comme paramètre searchList avec dedans une liste de sons, titre ou liens (il faut aussi mettre un Bearer Token)
L'app nous renvoie des titres pour chacun des liens 

Ensuite il faut faire une fonction pour télécharger les sons par rapport à la liste récupérer (je m'occuperais de faire le contenu de cette fonction, fait moi juste la structure)


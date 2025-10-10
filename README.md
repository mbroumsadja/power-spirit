# send_file_speedly

<img src="./public/power.png" alt="Texte alternatif" width="100" />

## Description

**send_file_speedly** est une application realiser dans le but de transferer rapidement et de maniere sécurisé de fichiers entre plusieurs appareils, sans avoir besoin d'utiliser WhatsApp ou d'autres messageries.par exemple entre tes appareil, ou avec plusieurs collègues en ligne.

## Fonctionnalités

- connecter a la room
- Transfert de fichiers rapide entre différents appareils
- Partage simultané à plusieurs utilisateurs
- Sécurité renforcée pour les échanges de fichiers

**Ces limites**
1- **_sans connection internet cette application web n'est pas utile_**
2- **_elle ne gere que quel que aspect de la messagerie en ligne mais neamoins utile pour discuter directement_**
3- **_l'utilisateur d'android peut envoyer un fichier mais le recevras pas lui meme mais dans le cas contraire tous les autre oporateur desktop ou laptop le recevrons ._**

## Utilisation 

<video src="./public/powe-spirit-demo.webm" alt="Texte alternatif" autoplay></video>/>

## Technologies utilisées

### Backend

- Node.js
- Express
- Socket.io
- Multerjs
- SQLite3

### Frontend

- view engine (PUG)
- CDN socket io
- javascript
- style sheet cascading

## Routes

/ (route principale)
/uploads (pour enregistrer les fichiers)

## Base de donnee

**Base de donnee** Chat.db

**Table sql**
file { id , sender_name , name_file , taille }

## Gestion des taches

kanban de **Germin**

## Licence

Ce projet est sous licence ISC.

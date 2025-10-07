# send_file_speedly

## Description

**send_file_speedly** est une application realiser dans le but de transferer rapidement et de maniere sécurisé de fichiers entre plusieurs appareils, sans avoir besoin d'utiliser WhatsApp ou d'autres messageries.par exemple entre tes appareil, ou avec plusieurs collègues en ligne.

## Fonctionnalités
- connecter a la room
- Transfert de fichiers rapide entre différents appareils
- Partage simultané à plusieurs utilisateurs
- Sécurité renforcée pour les échanges de fichiers

**Ces limites** 
sans connection internet cette application web n'est utilise 
elle ne gere que quel que aspect de la messagerie en ligne mais neamoins utilise lorsqu'on veux envoyer rapidement

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

## Base de donnee

**Base de donnee** Chat.db

**Table sql**
user { id_user ,nom , email}
room { id_room ,nom ,access, etat}
message{ id_maessage, id_room, content , taille, , sender_id , receiver_id}

## Gestion des taches

kanban de **Germin**

## Contribuer

Les contributions sont les bienvenues ! N'hésite pas à ouvrir une issue ou une pull request.

## Licence

Ce projet est sous licence ISC.

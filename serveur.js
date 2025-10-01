import express from 'express';

const app = express();
const Port = 3000;

app.get('/', (req , res) => {
    res.send('Bienvenue sur le serveur de Send File Speedly !');
})

app.post('/message', (req, res) => {
    res.send('Message reçu !');
})

app.post('/pdf', (req, res) => {
    res.send('pdf reçu !');
})

app.post('/mp3', (req, res) => {
    res.send('mp3 reçu !');
})

app.post('/mp4', (req, res) => {
    res.send('mp4 reçu !');
})

app.listen(
    Port ,
    () => { console.log("Le serveur tourne sur le port "+ Port) }
)
import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
import {createServer} from 'http'
import { Server} from 'socket.io';
import { fileURLToPath } from 'url';
import {
    db,
  userHandlers,
  roomHandlers,
  messageHandlers
} from './database/db.js'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const Port = 3300;
const server = createServer(app)
const io = new Server(server);

app.use(favicon(path.join(__dirname,'favicon.ico')));
app.use("/static" , express.static(path.join(__dirname, 'public')));
app.use(express.json())

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

io.on('connection',(socket) =>)

app.get('/', (req , res) => {
    res.render('index');
});

app.post('/users', (req, res) => userHandlers.create(req, res, db));
app.delete('/users/:id', (req, res) => userHandlers.delete(req, res, db));

app.post('/rooms', (req, res) => roomHandlers.create(req, res, db));
app.get('/rooms/public', (req, res) => roomHandlers.getAll_public(req, res, db));
app.get('/rooms/private', (req, res) => roomHandlers.getAll_private(req, res, db));
app.delete('/rooms/:id', (req, res) => roomHandlers.delete(req, res, db));

app.post('/messages', (req, res) => messageHandlers.create(req, res, db));
app.get('/messages', (req, res) => messageHandlers.getAll(req, res, db));
app.post('/messages/:ID', (req, res) => messageHandlers.getByReceiverId(req, res, db));
app.delete('/messages/:ID', (req, res) => messageHandlers.delete(req, res, db));

server.listen(
    Port ,
    () => { console.log("Le serveur tourne sur le port " + Port) }
)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// ===============================================
// MULTER CONFIGURATION (Gère l'upload de fichiers)
// ===============================================

// S'assurer que le répertoire 'uploads' existe
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Garder le nom de fichier original et l'extension
        cb(null, Date.now() + '-' + file.originalname.replace(/ /g, "_"));
    }
});

const upload = multer({ storage: storage });

// ===============================================
// EXPRESS MIDDLEWARE & ROUTES
// ===============================================

// Servir les fichiers statiques (index.html, admin.html, styles, etc.)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Route pour l'interface d'administration
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route pour l'upload de l'audio
app.post('/upload-audio', upload.single('audioFile'), (req, res) => {
    if (!req.file) {
        return res.json({ success: false, message: "Aucun fichier audio n'a été uploadé." });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`Audio uploadé: ${fileUrl}`);
    res.json({ success: true, url: fileUrl });
});

// Route pour l'upload de Gobos (images)
app.post('/upload-gobo', upload.single('goboFile'), (req, res) => {
    if (!req.file) {
        return res.json({ success: false, message: "Aucun fichier Gobo n'a été uploadé." });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`Gobo uploadé: ${fileUrl}`);
    res.json({ success: true, url: fileUrl });
});


// ===============================================
// SOCKET.IO LOGIC
// ===============================================

let clients = {}; // Stocke les clients connectés par ID
let groupCounts = {}; // Stocke le nombre de clients par groupe
let timeline = [];

io.on('connection', (socket) => {
    console.log('Nouveau client connecté:', socket.id);
    
    // Initialisation du client dans un groupe temporaire
    clients[socket.id] = { group: 'unknown' };
    io.emit('update-count', { count: Object.keys(clients).length });

    // Enregistrement du client dans son groupe
    socket.on('client-group', (data) => {
        const previousGroup = clients[socket.id]?.group;
        
        // Mettre à jour les comptes de l'ancien groupe
        if (previousGroup && previousGroup !== 'unknown') {
            groupCounts[previousGroup] = (groupCounts[previousGroup] || 1) - 1;
            if (groupCounts[previousGroup] <= 0) delete groupCounts[previousGroup];
        }

        // Mettre à jour le nouveau groupe
        clients[socket.id] = { group: data.group };
        groupCounts[data.group] = (groupCounts[data.group] || 0) + 1;
        
        console.log(`Client ${socket.id} rejoint le groupe: ${data.group}`);
        io.emit('update-count', { count: Object.keys(clients).length });
    });

    // Commande envoyée par l'admin (Live Console ou Preview)
    socket.on('admin-order', (data) => {
        // Envoi de la commande à tous les clients
        io.emit('execute', data); 
        console.log(`Ordre exécuté: ${JSON.stringify(data)}`);
    });

    // Chargement de la timeline (Admin -> Tous les clients)
    socket.on('timeline-load', (data) => {
        timeline = data.timeline;
        io.emit('timeline-start', { timeline: timeline });
        console.log(`Timeline chargée avec ${timeline.length} événements.`);
    });
    
    // Synchronisation Timecode (Admin -> Tous les clients)
    socket.on('timecode-sync', (data) => {
        // Envoi de l'heure actuelle aux clients pour qu'ils déclenchent eux-mêmes les événements.
        io.emit('timecode-sync', data);
    });

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        const disconnectedGroup = clients[socket.id]?.group;
        
        if (disconnectedGroup && disconnectedGroup !== 'unknown') {
            groupCounts[disconnectedGroup] = (groupCounts[disconnectedGroup] || 1) - 1;
            if (groupCounts[disconnectedGroup] <= 0) delete groupCounts[disconnectedGroup];
        }
        
        delete clients[socket.id];
        console.log('Client déconnecté:', socket.id);
        io.emit('update-count', { count: Object.keys(clients).length });
    });
});

// ===============================================
// DÉMARRAGE DU SERVEUR
// ===============================================

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Interface Client: http://localhost:${PORT}`);
    console.log(`Interface Admin: http://localhost:${PORT}/admin`);
});

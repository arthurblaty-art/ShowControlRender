const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

// Servir les fichiers statiques (index.html, admin.html, styles...)
app.use(express.static("public"));

// Route de l'interface Admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Route de l'interface Client (téléphone)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  // Attribution aléatoire du groupe et génération de l'ID court
  const group = Math.random() < 0.5 ? "Groupe A" : "Groupe B";
  const id = socket.id.substring(0, 4).toUpperCase();
  
  socket.join(group); // Joint la Room du groupe (A ou B)
  socket.join("all"); // Joint la Room 'all'

  // Envoi des infos d'identité au téléphone
  socket.emit("welcome", { id: id, group: group, color: group === "Groupe A" ? "#FF0000" : "#0000FF" });
  io.emit("update-count", { count: io.engine.clientsCount });

  socket.on("disconnect", () => {
    io.emit("update-count", { count: io.engine.clientsCount });
  });

  // RÉGIE : Réception et diffusion de la Timeline (au début de la séquence)
  socket.on("timeline-load", (data) => {
    // Diffuse la timeline à tous les clients
    io.emit("timeline-load", data); 
    console.log("Timeline chargée et prête à être synchronisée.");
  });

  // RÉGIE : Réception et diffusion du Time Code (à chaque tick)
  socket.on("timecode-sync", (data) => {
    // Diffuse la position de lecture à tous les clients
    io.emit("timecode-sync", data);
  });

  // Contrôle manuel (peut être utilisé pour des overrides rapides)
  socket.on("admin-order", (data) => {
    if (data.target === "all") {
        socket.broadcast.emit("execute", data);
    } else if (data.target === "Groupe A" || data.target === "Groupe B") {
        socket.to(data.target).emit("execute", data);
    } else {
        // Envoi ciblé par ID (on broadcast, le client filtre)
        socket.broadcast.emit("execute-specific", data);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

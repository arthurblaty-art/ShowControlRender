const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static("public"));

// Routes de l'application
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
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
  socket.emit("welcome", { id: id, group: group });
  io.emit("update-count", { count: io.engine.clientsCount });

  socket.on("disconnect", () => {
    io.emit("update-count", { count: io.engine.clientsCount });
  });

  // Réception des ordres de l'Admin et diffusion ciblée
  socket.on("admin-order", (data) => {
    // data.target peut être "all", "Groupe A", "Groupe B" ou un ID précis
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

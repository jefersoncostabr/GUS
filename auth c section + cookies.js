// server.js
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Configura sessão
app.use(session({
  secret: "segredo-super-seguro", 
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1h
}));

// Login (falso, exemplo)
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "123") {
    req.session.user = { username };
    return res.json({ message: "Login realizado!" });
  }
  res.status(401).json({ error: "Credenciais inválidas" });
});

// Rota protegida
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: "Não autorizado" });
  res.json({ message: `Bem-vindo, ${req.session.user.username}` });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logout feito" });
  });
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));


// ** teste teste
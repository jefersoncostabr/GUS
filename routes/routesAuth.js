import Router from "express";
import bcrypt from "bcrypt";
import solicitanteModelo from "../src/models/usuariosmodel.js";

const routesAuth = Router();

// const usuariosCadastrados = [
//     {username: "admin", password: "123"},
//     {username: "user", password: "abc"}
// ];

// ***** BKP - Autenticação Simples (sem hash) *****
// // Login (exemplo simples)
// routesAuth.post("/login", (req, res) => {
//     const { username, password } = req.body;
//     const usuario = usuariosCadastrados.find(
//         (u) => u.username === username && u.password === password
//     );
//     if (usuario) {
//         req.session.user = { username: usuario.username };
//         return res.json({ message: "Login realizado!" });
//     }
//     res.status(401).json({ error: "Credenciais inválidas" });
// });

async function comparePasswords(password, hashedPassword) {
    // console.log("Comparando senha fornecida com hash armazenado");
  try {
    // console.log("password:", password);
    // console.log("hashedPassword:", hashedPassword);
    if (!hashedPassword) {
        console.log("Hashedpassword é empty ou undefined");
        return false;
    }
    const match = await bcrypt.compare(password, hashedPassword);
    return match;
  } catch (error) {
    console.error('Erro ao comparar senhas:', error);
    return false;
  }
}
async function encontraUmUsuario(nomeSolicitante) {
  try {
    const usuario = await solicitanteModelo.findOne({ solicitante: nomeSolicitante });
    return usuario;
  } catch (err) {
    console.error("Erro na query de usuário:", err);
    throw err; // repassa para o catch da rota
  }
}

routesAuth.post("/login", async (req, res) => {
  try {
    // console.log("Body recebido:", req.body);
    const { solicitante, password } = req.body;

    // console.log("Tentativa de login:", solicitante);
    // console.log("Senha fornecida:", password);

    const usuario = await encontraUmUsuario(solicitante);
    // console.log("Usuário encontrado no banco:", usuario);

    if (!usuario) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const passwordDoBanco = usuario.senha;

    const passwordMatch = await comparePasswords(password, passwordDoBanco);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    req.session.user = { solicitante: usuario.solicitante, role: usuario.role };
    return res.json({ message: "Login realizado!" });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});




routesAuth.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logout feito" });
    });
});

export default routesAuth;
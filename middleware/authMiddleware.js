export function authMiddleware(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    next();
}

//como pedir usuatio e senha se não for autorizado?
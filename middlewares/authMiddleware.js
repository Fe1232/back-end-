import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            error: 'A autenticação não está configurada corretamente.',
            code: 'AUTH_CONFIG_INVALID'
        });
    }

    const authHeader = req.headers.authorization;

    if(!authHeader) {
        return res.status(401).json({
            error: 'Token de autenticação não fornecido.',
            code: 'AUTH_TOKEN_MISSING'
        });
    }

    const [scheme, token, extra] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token || extra) {
        return res.status(401).json({
        error: 'Formato de token inválido.',
        code: 'AUTH_TOKEN_INVALID'
    });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
        error: 'Token inválido ou expirado.',
        code: 'AUTH_TOKEN_INVALID'
    });
    }
}
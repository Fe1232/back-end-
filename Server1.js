import "dotenv/config"
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import ProductsRoutes from './routes/ProductsRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './lib/swagger.js';

const app = express();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured before starting the server.');
}

// Enable Cross-Origin Resource Sharing for the frontend application.
app.use(cors());

// Allow the server to parse JSON payloads from incoming requests.
app.use(express.json({ limit: '100kb' }));

app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// Mount user-related routes, including CRUD operations.
app.use(userRoutes);

// Mount product-related routes.
app.use(ProductsRoutes);

// Return a consistent JSON error for malformed JSON and unknown routes.
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            error: 'O corpo da requisição contém um JSON inválido.',
            code: 'INVALID_JSON'
        });
    }

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        error: 'O servidor não conseguiu concluir a operação.',
        code: 'SERVER_ERROR'
    });
});

app.use((req, res) => {
    return res.status(404).json({
        error: 'A operação solicitada não existe.',
        code: 'ROUTE_NOT_FOUND'
    });
});

const PORT = process.env.PORT || 8000;

// Start the server and listen on port 8000.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
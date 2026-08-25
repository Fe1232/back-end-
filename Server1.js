import "dotenv/config"
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import ProductsRoutes from './routes/ProductsRoutes.js';

const app = express();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured before starting the server.');
}

// Enable Cross-Origin Resource Sharing for the frontend application.
app.use(cors());

// Allow the server to parse JSON payloads from incoming requests.
app.use(express.json({ limit: '100kb' }));

// Mount user-related routes, including CRUD operations.
app.use(userRoutes);

// Mount product-related routes.
app.use(ProductsRoutes);

// Start the server and listen on port 8000.
app.listen(8000, '0.0.0.0', () => {
    console.log('Server running on port 8000');
});
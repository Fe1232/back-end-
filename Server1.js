import "dotenv/config"
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import ProductsRoutes from './routes/ProductsRoutes.js';

const app = express();

// Enable Cross-Origin Resource Sharing for the frontend application.
app.use(cors());

// Allow the server to parse JSON payloads from incoming requests.
app.use(express.json());

// Mount user-related routes, including CRUD operations.
app.use(userRoutes);

// Mount product-related routes.
app.use(ProductsRoutes);

// Start the server and listen on port 8000.
app.listen(8000, '0.0.0.0', () => {
    console.log('Server running on port 8000');
});
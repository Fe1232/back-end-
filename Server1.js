import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(userRoutes); // ou app.use('/users', userRoutes) se preferir prefixar

app.listen(8000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 8000");
});
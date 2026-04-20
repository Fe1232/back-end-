import express from 'express'
import prisma from './lib/prisma.js'
import cors from 'cors'

const app = express();

app.use(cors());
app.use(express.json());


//Metodos Http para /users
app.post('/users', async (req, res) => {
    await prisma.user.create({
        data: {
            nameStore: req.body.nameStore,
            email: req.body.email,
            key: req.body.key,
            accountPro: req.body.accountPro,
        }
    })

   res.status(201).json(req.body);
})

app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();

    res.status(200).json(users);
});

app.put('/users/:id', async (req, res) => {

    await prisma.user.update({
        where: {
            id: req.params.id
        },
        data: {
            nameStore: req.body.nameStore,
            email: req.body.email,
            key: req.body.key,
            accountPro: req.body.accountPro,
        }
    })

   res.status(201).json(req.body);
});

app.delete('/users/:id', async (req, res) => {
    await prisma.user.delete({
        where: {
            id: req.params.id
        }
    });

    res.status(200).json({ message: 'Usuário deletado com sucesso!'});
});
//Fim dos métodos http para usuarios

//Inicio dos métodos http para produtos
app.post('/products', async (req, res) => {
    await prisma.products.create({
        data: {
            nameProduct: req.body.nameProduct,
            category: req.body.category,
            costPrice: req.body.costPrice,
            priceToSell: req.body.priceToSell,
            quantity: req.body.quantity,
            warningPoint: req.body.warningPoint,
        }
    })

   res.status(201).json(req.body);
})

app.get('/products', async (req, res) => {
    const product = await prisma.products.findMany();

    res.status(200).json(product);
});

app.put('/products/:id', async (req, res) => {

    await prisma.products.update({
        where: {
            id: req.params.id
        },
        data: {
            nameProduct: req.body.nameProduct,
            category: req.body.category,
            costPrice: req.body.costPrice,
            priceToSell: req.body.priceToSell,
            quantity: req.body.quantity,
            warningPoint: req.body.warningPoint,
        }
    })

   res.status(201).json(req.body);
});

app.delete('/products/:id', async (req, res) => {
    await prisma.products.delete({
        where: {
            id: req.params.id
        }
    });

    res.status(200).json({ message: 'Produto deletado com sucesso!'});
});
//Fim dos métodos http para os produtos

app.listen(8000);

/*
banco de dados:
user: juniorpitsch_db_user
key: 96RWOkvw9tT93o7Q
*/ 
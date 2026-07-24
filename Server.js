import express, { response } from 'express'
import prisma from './lib/prisma.js'
import cors from 'cors'
import { rmSync } from 'node:fs';
import bcrypt from 'bcrypt';

const app = express();

app.use(cors());
app.use(express.json());


//Metodos Http para /users

//cria um novo usuário
app.post('/users', async (req, res) => {
    try {
        const { nameStore, email, key, accountPro } = req.body;

        if (!key || key.length < 6) {
            return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
        }

        //encodes the password
        const SALT_ROUNDS = 10;
        const hashedKey = await bcrypt.hash(key, SALT_ROUNDS);

        //Pega os dados e cria o usuário
        await prisma.user.create({
            data: {
                nameStore: nameStore,
                email: email,
                key: hashedKey,
                accountPro: accountPro,
            }
        })
        //Se der certo envia um 201 criado
        res.status(201).json({ response: "Conta criada com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro do servidor" });
    }
});

//POST method used to perform user verification
app.post('/login', async (req, res) => {
    try {
        //takes the data the site sent
        const { email, key } = req.body;

        //Pede ao prisma para buscar um único usuário pelo email
        const user = await prisma.user.findUnique({
            where: { email: email }
        });

        //checks if the users exists
        if (!user) {
            return res.status(401).json({ error: "E-mail ou senha inválidos" });
        };

        //Compares to password
        const passwordMatches = await bcrypt.compare(key, user.key)

        //checks if the password is correct
        if (!passwordMatches) {
            //Se o email ou senha não coincidirem da 401
            return res.status(401).json({ error: "E-mail ou senha inválidos" });
        }

        //Se está tudo certo retornamos os dados básicos
        res.status(200).json({
            id: user.id,
            nameStore: user.nameStore,
            email: user.email
        });
    } catch (err) {
        //Se houver algum erro retorna 500
        res.status(500).json({ error: "Erro interno no servidor" });
    }

})

//Método get usado para pegar todos os usuários
app.get('/users', async (req, res) => {
    try {
        //Pega todos os usariaos
        const users = await prisma.user.findMany();
        //retorna 200 "Deu certo"
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

//Atualiza os dados de algum usuário
app.put('/users/:id', async (req, res) => {
    try {
        const dataUpdate = {
            nameStore: req.body.nameStore,
            email: req.body.email,
            accountPro: req.body.accountPro,
        }

        if (req.body.key) {
            if (req.body.key.length < 6) {
                return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
            }
            const SALT_ROUNDS = 10;
            dataUpdate.key = await bcrypt.hash(req.body.key, SALT_ROUNDS);
        };
        //Procura o usuário que possui este id
        await prisma.user.update({
            where: { id: req.params.id },
            data: dataUpdate
        })

        //Se der tudo certo retorna 201
        res.status(201).json({ response: "Dados atualizados com sucesso!" });
    } catch (err) {
        //Se houver algum erro retorna 500
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

//Delera algum usuário
app.delete('/users/:id', async (req, res) => {
    try {
        //Procura o usuário e deleta ele
        await prisma.user.delete({
            where: {
                id: req.params.id
            }
        });

        //Se der tudo certo retorna 200
        res.status(200).json({ message: 'Usuário deletado com sucesso!' });
    } catch (err) {
        //Se houver algum erro retona 500
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});
//Fim dos métodos http para usuarios

//Inicio dos métodos http para produtos

//Cria um novo produto
app.post('/products', async (req, res) => {
    try {
        //Pega os dados enviados pelo site e cria um novo produto
        await prisma.products.create({
            //Cria o novo produto
            data: {
                nameProduct: req.body.nameProduct,
                category: req.body.category,
                costPrice: req.body.costPrice,
                priceToSell: req.body.priceToSell,
                quantity: req.body.quantity,
                warningPoint: req.body.warningPoint,
                userId: req.body.userId,
            }
        });

        //Se der tudo certo retorna 201
        res.status(201).json(req.body);
    } catch (err) {
        //se houver algum erro retorna 500
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

//Mostra todos os produtos do usuário
app.get('/products/:userId', async (req, res) => {
    try {
        //Pega os produtos do Produto
        const product = await prisma.products.findMany({
            where: {
                userId: req.params.userId //Só mostra os produtos do usuário
            }
        });

        //Se estiver tudo certo retorna 200 e os usuários
        res.status(200).json(product);
    } catch (err) {
        //Se houver algum erro com o servidor retorna 500
        res.status(500).json({ error: "Erro interno no servidor" })
    }
});

//Altera algum Produto
app.put('/products/:id', async (req, res) => {
    try {
        await prisma.products.update({
            //Procura o produto que conincide com o id
            where: {
                id: req.params.id
            },
            //Altera os dados especificados 
            data: {
                nameProduct: req.body.nameProduct,
                category: req.body.category,
                costPrice: req.body.costPrice,
                priceToSell: req.body.priceToSell,
                quantity: req.body.quantity,
                warningPoint: req.body.warningPoint,
            }
        })

        //Se estiver tudo certo retorna 201
        res.status(201).json(req.body);
    } catch (err) {
        //Se houver algum erro com o servidor retorna 500
        res.status(500).json({ error: "Erro interno no Servidor" });
    }
});

//Deleta algum Produto
app.delete('/products/:id', async (req, res) => {
    try {
        //Recebe o id do usuário pelo corpo da requisição
        const { userId } = req.body;

        const deleteProduct = await prisma.products.deleteMany({
            //Procura o Produto que coincide com o id e deleta ele
            where: {
                id: req.params.id,
                userId: userId //Só deleta se o produto for desse usuário
            }
        });

        //Verifica se o produto foi deletado
        if (deleteProduct.count === 0) {
            return res.status(403).json({ error: "Você não tem autorização para deletar este Produto." })

        }

        //Se estiver tudo certo retorna 200
        res.status(200).json({ message: 'Produto deletado com sucesso!' });
    } catch (err) {
        //Se houver algum erro com o servidor retorna 500
        res.status(500).json({ error: "Erro interno no servidor" })
    }
});
//Fim dos métodos http para os produtos

app.listen(8000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 8000");
});
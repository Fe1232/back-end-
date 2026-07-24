import { response } from 'express';
import { createAccont, userLogin, getUser } from '../services/UserServices.js'

export async function createAccontUser(req, res) {
    try {
        //gets the variables required for the function and calls it
        const { nameStore, email, key, accountPro} = req.body;
        const createUser = await createAccont(nameStore, email, key, accountPro);

        //Check if the data is correct.
        if(!createUser) {
            return res.status(401).json({ error: "Os dados enviados estão incorretos."});
        }

        //If Correct
        res.status(200).json({ response: "Conta criada com sucesso" });
    } catch (err) {
        //Server erro
        res.status(500).json({ error: "Erro do servidor" });
    }
}

export async function login(req, res) {
    try {
        //gets the variables required for the function and calls it
        const { email, key } = req.body;
        const user = await userLogin(email, key);

        //Check if the data is correct.
        if(!user) { 
            return res.status(401).json({ error: "E-mail ou senha inválidos" });
        }

        //If Correct
        res.status(200).json(user); 
    } catch(err) {
        //Server error
        res.status(500).json({ error: "Erro interno no servidor" });
    }
}

export async function getsUsers(req, res) {
    try {
        const users = await getUser();

        return res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: "Erro interno no servidor" });
    }
}
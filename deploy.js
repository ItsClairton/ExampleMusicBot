// Você só deve executar o deploy quando estiver executando o bot pela primeira vez
// ou então, quando criar novas interações (Slash Commands & Context Menu)
// ou alterar o nome, descrição ou opções de uma interação existente
const { Client } = require('discord.js')

const client = new Client({ intents: 'GUILDS' })
const config = require('./config.json')

client.on('ready', () => {
    client.application.commands.set([
        {
            name: "ping",
            description: "Saber latência do bot"
        },
        {
            name: "skip",
            description: "Pular uma música"
        },
        {
            name: "pause",
            description: "Pausar ou despausar uma música"
        },
        {
            name: "resume",
            description: "Pausar ou despausar uma música"
        },
        {
            name: "play",
            description: "Tocar músicas do YouTube",
            options: [{
                name: "nome",
                type: "STRING",
                description: "Nome ou URL de um vídeo do YouTube",
                required: true
            }]
        }
    ]).catch(err => console.log("Um erro ocorreu ao fazer deploy dos comandos para a API do Discord.", err))
      .then(() => console.log("Deploy de comandos feito com sucesso, agora basta executar \"npm run start\""))
      .finally(() => process.exit())
})

client.login(config.token).catch(err => console.log("Um erro ocorreu ao conectar-se com o Discord, token incorreto?", err))
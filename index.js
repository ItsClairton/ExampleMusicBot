// Estamos definindo uma varíavel chamada Discord, que aponta para a biblioteca "discord.js"
// A gente vai utilizar essa biblioteca para conversar com a API do Discord.
// A mesma coisa a gente tá fazendo pra voice que aponta para a lib de voz do DiscordJS
// E ytdl, que é uma biblioteca que consegue obter informações de vídeos do YouTube, e tocar em tempo real.
// Nós estamos usando a biblioteca ytrs porque a ytdl-core não suporta pesquisas, ela apenas suporta links.
const Discord = require('discord.js')
const voice = require('@discordjs/voice')
const ytdl = require('ytdl-core')
const ytsr = require('ytsr')

// Sobre promisses: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
const { promisify } = require('util')

// Criando uma variavel wait que transforma a função interna setTimeout do JavaScript em uma Promisse
// Nós só estamos utilizando esse wait para reestabelecer a conexão de voz. 
const wait = promisify(setTimeout);

// Estamos definindo uma variavel chamada config que aponta para o nosso arquivo de configurações
const config = require('./config.json')

// Aqui estamos criando uma nova instancia da classe Client do discord.js.
// Intents são eventos, então você deve falar para a API do Discord quais eventos você deseja receber
// Exemplo: Você deseja saber quando alguém começa a escrever na DM do bot no Discord
// Então você deve colocar entre esses colchetes ([]) 'DIRECT_MESSAGE_TYPING'
// Se você não fizer isso, você não receberá o evento.
// Mais informações em: https://discordjs.guide/popular-topics/intents.html#the-intents-bitfield
const client = new Discord.Client({ intents: ['GUILD_VOICE_STATES', 'GUILDS'] })

// Lista dos players, cada guilda tem um player
// É possível pegar um player usando players.get(ID DA GUILDA)
/** @typedef {{ title: string, url: string, thumbnail: string, duration: string, author: string, requester: Discord.User }} Track */
/** @typedef { { id: string, channel: Discord.TextChannel, lock: boolean, queue: [Track], current: Track, connection: voice.VoiceConnection, dispatcher: voice.AudioPlayer, handleQueue(), destroy() }} Player */
/** @type {Map<string, Player>} */
const players = new Map();

// Nós esttamos usando um Regex para validar se já é uma URL do YouTube ou não.
// Você pode saber mais sobre Regex aqui: https://medium.com/xp-inc/regex-um-guia-pratico-para-express%C3%B5es-regulares-1ac5fa4dd39f
const linkRegex = "(https?://)?(www\\.)?(yotu\\.be/|youtube\\.com/)?((.+/)?(watch(\\?v=|.+&v=))?(v=)?)([\\w_-]{11})(&.+)?"

// Nós colocamos isso para evitar que um erro fatal crashe o Bot
process.on('uncaughtException', function(err) {
    console.log('Um erro inesperado ocorreu: ', err);
});

// Quando a conexão com o Discord for feita com sucesso.
client.on('ready', () => console.log("Conexão com o Discord feita com Sucesso."))

// Quando uma nova interação acontecer
// OBS: Interações são, Slash Commands, Context Menus, e Components, components são Botões, etc.
// Mais informações sobre Slash Commands: https://discordjs.guide/interactions/replying-to-slash-commands.html
client.on('interactionCreate', async(i) => {
    // Se a interação não for um comando, ou ela não for executada em uma guilda, ignore.
    if (!i.isCommand() || !i.guildId) return;

    // Se o comando for "ping"
    if (i.commandName == "ping") {
        return i.reply(`:ping_pong: | Pong, ${Math.round(client.ws.ping)}ms`)
    }

    // Se o comando for "play"
    if (i.commandName == "play") {

        // Obter os argumentos que o usuário passou via Slash Commands
        // Não é necessário verificar se os argumentos existem pois
        // se a opção required estiver ativada lá no deploy.js
        // o discord obriga o usuário a colocar alguma coisa
        const args = i.options.getString("nome")
        
        // Pegar o canal de voz que a pessoa estiver conectada na guilda
        /** @type {Discord.VoiceState} */
        const { channel } = i.member.voice

        // Se o canal de voz for undefined ou null, então siginifica que ele não está em nenhum canal.
        if(!channel) return i.reply(":x: | Você precisa estar conectado em um canal de voz.")

        // Pegar o objeto player da guilda em que a interação é executada
        let player = players.get(i.guildId)

        if(!player) { // Se o player da guilda não existir, então vamos criar um.
            const connection = await voice.joinVoiceChannel({ channelId: channel.id, guildId: i.guildId, adapterCreator: channel.guild.voiceAdapterCreator })
            if(!connection) return i.reply(":x: | Um erro ocorreu ao se conectar ao canal de voz.")            
            player = await newPlayer(i.guildId, i.channel, connection)
        }

        // Nós precisamos fazer isso porque demora um pouco para carregar informações do vídeo no YouTube
        // Esse método pede mais tempo para a API do Discord, por padrão você só tem 5 segundos para responder a interação
        // Quando você pede mais tempo, você tem 15 minutos para responder.
        // Você deve responder o Discord a partir daqui usando o método editReply e não mais reply.
        await i.deferReply()

        let video;

        // Você pode saber mais sobre Try Catch aqui: https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Statements/try...catch
        try {
            // Se os argumentos forem compátivel com o Regex que definimos no inicio do arquivo
            // Então siginifica que o argumento já é uma URL do YouTube
            // Então nesse caso usaremos a ytdl-core para pegar informações básicas sobre o vídeo
            if(args.match(linkRegex)) {
                const data = await ytdl.getBasicInfo(args, { lang: 'PT' })
                console.log(data.videoDetails.lengthSeconds)
                video = {
                    title: data.videoDetails.title,
                    author: data.videoDetails.author.name,
                    url: args,
                    // Nós estamos pegando o último item da Array porque o último item é o que tem melhor qualidade de thumbnail
                    // Você pode saber mais sobre Arrays aqui: https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Array
                    thumbnail: data.videoDetails.thumbnails.at(-1).url,
                    duration: toHHMMSS(data.videoDetails.lengthSeconds), // O ytdl-core não retorna a duração do vídeo já formatada, então devemos nós mesmos formatar.
                    author: data.videoDetails.author.name,
                    requester: i.user,
                }
            } else { // Caso contrário então devemos usar a ytsr para pesquisar no YouTube e obter informações básicas sobre o argumento.
                const result = await ytsr(args, { limit: 5, gl: 'BR', hl: 'PT' })
            
                // Essa API retorna vídeos, playlists, canais etc, nós só precisamos de vídeos, então precisamos filtrar.
                const entry = result.items.filter(i => i.type == "video")[0]
    
                // Se tiver resultados, então vamos definir a variável vídeo para o resultado que encontramos.
                if(entry) video = { title: entry.title, url: entry.url, thumbnail: entry.bestThumbnail.url, duration: entry.duration, author: entry.author.name, requester: i.user }
            }
        } catch (err) {
            i.editReply(":x: | Um erro ocorreu ao carregar o vídeo do YouTube.")
            return console.log("Um erro ocorreu ao carregar o Vídeo do YouTube.", err)
        }

        // Se a variavel video for undefined, então siginifica que não conseguimos obter informações sobre o vídeo.
        if(!video) return i.editReply(":x: | Nenhum resultado encontrado.")

        player.queue.push(video) // Adicionar o vídeo na fila.
        // Anunciar pro usuário que o vídeo foi adicionado com sucesso na fila.
        i.editReply(`:musical_note: | A Música **${video.title}** de **${video.author}** foi adicionada com sucesso na fila.`)

        // Vamos verificar se o player está tocando algo, se ele não tiver então chamaremos o método handleQueue para começar a tocar o que foi adicionado agora.
        if (player.dispatcher.state.status == voice.AudioPlayerStatus.Idle) return player.handleQueue()
    }

    if(i.commandName == "skip") {
        const player = players.get(i.guildId)
        const { channel } = i.member.voice

        if(!player) return i.reply(":x: | Não há nada tocando no momento.")
        if(!channel) return i.reply(":x: | Você deve estar se conectado a um canal de voz para fazer isso.")
    
        // Dar stop no Player interno do discord.js fara ele trocar pra Idle, automáticamente chamando a função handleQueue()
        player.dispatcher.stop()
        return i.reply(':musical_note: | Música pulada com sucesso.')
    }

    if(i.commandName == "pause" || i.commandName == "resume") {
        const player = players.get(i.guildId)
        const { channel } = i.member.voice

        if(!player) return i.reply(":x: | Não há nada tocando no momento.")
        if(!channel) return i.reply(":x: | Você deve estar se conectado a um canal de voz para fazer isso.")

        // Se o Player não estiver Pausado, então vamos pausar
        if(player.dispatcher.state.status != voice.AudioPlayerStatus.Paused) {
            player.dispatcher.pause()
            return i.reply(":pause_button: | Música pausada.")
        }

        // Se o player já estiver pausado, então vamos despausar
        player.dispatcher.unpause()
        return i.reply(":musical_note: | Música despausada.")
    }

});

/**
 * 
 * @param {voice.VoiceConnection} connection 
 * @param {string} guildId
 * @param {Discord.TextChannel} channel 
 * @return {Player} Objeto player já registrado no Map de Players
 */
async function newPlayer(guildId, channel, connection) {

    const dispatcher = voice.createAudioPlayer() // Player interno do DiscordJS
    connection.subscribe(dispatcher) // Interligar o Player com a conexão de voz, cada conexão de voz é um player distinto.

    // Criando uma variavel player, que é um objeto que contêm as informações que precisamos.
    // ID da Guilda, O objeto de canal de Texto, e uma variavel para sabermos se o player já está carregando algo, player interno do discord.js, e a fila da guilda
    /** @type {Player} player */
    const player = { id: guildId, channel: channel, lock: false, connection: connection, dispatcher: dispatcher, queue: [] }

    player.handleQueue = async function() {
        if(player.lock) return // Se esse boolean estiver verdadeiro então siginifca que o player já está carregando algo
        if (player.queue.length == 0) return player.destroy() // Se a fila estiver vazia, então exclua o Player e desconecte-se do canal de voz.

        player.lock = true // Deixar valor booleano verdadeiro para que esse método não seja executado 2x ao mesmo tempo.
        player.current = player.queue[0] // Definindo a música atual do Player
        player.queue.shift() // Removendo a música da fila

        const track = player.current // Definindo uma variavel pra ficar mais curto de escrever embaixo
        try {
            // Nós usamos filter para filtramos do YouTube apenas o áudio para evitar uso de banda e processamento atoa
            const resource = voice.createAudioResource(await ytdl(track.url, { filter: 'audioonly' }))
            dispatcher.play(resource);

            // Você pode saber mais sobre embeds aqui: https://discordjs.guide/popular-topics/embeds.html
            const embed = new Discord.MessageEmbed()
                .setColor("#0099ff")
                .setThumbnail(track.thumbnail)    
                .setDescription(`:musical_note: Tocando agora [${track.title}](${track.url})`)
                .addField("Autor", track.author, true)
                .addField("Duração", track.duration, true)
                .setFooter(`Pedido por ${track.requester.tag}`, track.requester.avatarURL())
            
            // Enviando o embed pro canal de texto.
            player.channel.send({ embeds: [embed] })
            player.lock = false // Definindo o valor de Lock para falso para permitir que essa função seja executada novamente.
        } catch (err) { // Caso aconteça algum erro
            player.channel.send(`:x: | Um erro ocorreu ao tocar a música **${track.title}** pedido por **${track.requester.tag}**.`)
            console.log(`Um erro ocorreu ao tocar a música ${track.title}, ID da Guilda: ${player.id}.`, err)
            
            player.current = undefined // Definindo a música atual do Player para nenhuma, já que deu erro/
            player.lock = false // Definindo o valor de Lock para falso para permitir que essa função seja executada novamente.
            player.handleQueue() // Chamando essa função novamente, para carregar a próxima música.
        }

    }

    player.destroy = function() {
        player.connection.destroy() // Encerrando a conexão de voz.
        players.set(player.id, undefined) // Removendo o nosso Player da lista de players
    }

    // Escutar quando os status do Player interno do DiscordJS alterar
    dispatcher.on('stateChange', async (oldState, newState) => {
        if(oldState.status != newState.status && newState.status == voice.AudioPlayerStatus.Idle) {
            player.current = undefined // Definindo variavel de música atual para nula.
            player.handleQueue() // Chamando o método que definimos ali encima para tocar a próxima música.
        }
    })

    dispatcher.on('error', async (err) => {
        player.channel.send(`:x: | Um erro ocorreu ao tocar a música **${player.current.title}** pedido por **${player.current.requester.tag}**.`)
        console.log(`Um erro ocorreu ao tocar a música ${player.current.title}, ID da Guilda: ${player.id}.`, err)
        
        // Vamos cahamr o método handleQueue novamente para que o Player pule para a próxima música.
        player.current = undefined
        player.handleQueue()
    })

    // Escutar quando os status da conexão de voz alterar.
    connection.on('stateChange', async (_, state) => {
        // Se o status de conexão é Desconectado
        if(state.status == voice.VoiceConnectionStatus.Disconnected) {

            // Segundo o código de exemplo do DiscordJS, se a conexão for fechada com código 4014, siginifica
            // Que não devemos faxer reconexão automática, esse código acontece por 2 motivos
            // O bot foi movido de canal, ou o bot foi expulso do Canal
            if(state.reason == voice.VoiceConnectionDisconnectReason.WebSocketClose && state.closeCode == 4014) {
                
                // Vamos esperar por 5 segundos, se o estado não alterar, nós receberemos um sinal em 5 segundos
                // Se o estado não alterar, siginifica provavelmente que fomos expulsos do canal, precisamos remover o Player da guilda.
                // Caso o estado altere, siginifica que fomos apenas movidos e não precisamos fazer nada
                return await voice.entersState(connection, voice.VoiceConnectionStatus.Connecting, 5_000).catch(player.destroy())
            }

            // Caso simplismente tenhamos perdido a conexão com o Canal, então
            // Vamos tentar reconectar no canal 5 vezes
            if (connection.rejoinAttempts < 5) {
                // Esperar 5 segundos para tentar se reconectar.
                await wait((connection.rejoinAttempts + 1) * 5_000);
                connection.rejoin()
            } else {
                // Caso já seja 5 tentativas de conexão, então destrua o Player da Guilda
                player.destroy()
            }
        }

    })

    // Setando o novo player pro ID da guilda respectiva, na lista de players.
    players.set(guildId, player)

    // Retornando o objeto pra quem chamou essa função
    return player
}

function toHHMMSS(baseSeconds) {
    const number = parseInt(baseSeconds, 10) // Precisamos converter a String em um número inteiro para fazermos calculos

    // Não foi possível converter em um Número, então provavelmente é uma live.
    if (!number) return "LIVE"

    // Math.floor Serve para pegar o maior número inteiro possível, menor ou igual ao número que passamos para a função.
    const hours = Math.floor(number / 3600) // // 1 hora é igual a 3600 segundos
    const minutes = Math.floor((number - (hours * 3600)) / 60)
    const seconds = number - (hours * 3600) - (minutes * 60)

    // Se as horas forem maior do que zero, então devemos mostrar elas no resultado também.
    if (hours > 0) return `${hours}:${minutes}:${seconds}`

    // Caso contrário só retornamos os minutos e segundos.
    return `${minutes}:${seconds}`
}

// Efeturar login na API do Discord, caso aconteça um erro então retorne para o usuário informando o erro.
client.login(config.token).catch(err => console.log("Um erro ocorreu ao conectar-se com o Discord, token incorreto?", err))

# SimpleMusicBot
Apenas uma simples demonstração de um bot de música utlizando o DiscordJS v13, já com suporte a SlashCommands

## 🤔 Como usar?
- Você precisa de [NodeJS](https://nodejs.org/) v16 ou superior instalado em seu sistema para utilizar esse bot.
- Você também precisa já ter criado uma conta para o seu Bot, tutorial de como criar uma conta [aqui](https://discordpy.readthedocs.io/en/stable/discord.html).
- Você precisa editar o nome do arquivo `config.json.example` para `config.json` e preencher o arquivo com o token do seu bot.
- Se você estiver abrindo o bot pela primeira vez, você deve instalar as depedências usando `npm install`, e registrar os comandos no Discord usando `npm run deploy`.
- Agora basta usar `npm run start` e curtir suas músicas.

## 📚 Depedências
- discord.js `v13.3.1` - API que utilizamos para se comunicar com o Discord.
- @discordjs/voice `v13.3.1` - Módulo de voz do DiscordJS.
- opusscript `v0.0.8` - O Discord requer que você envie o áudio em formato Opus, então essa biblioteca serve para que o módulo de voz do discord.js converta, quando for necessário, o áudio do YouTube para Opus.
- tweetnacl `v1.0.3` - O Discord requer que você envie o áudio criptografado, então essa API serve para o módulo de voz do discord.js criptografar o áudio automáticamente.
- ytdl-core `v4.9.1` - Biblioteca para obtermos o áudio, e informações sobre o vídeo que formos tocar.
- ytsr `v3.5.3` - O `ytdl-core` apenas suporta o URL direto do vídeo, então essa biblioteca serve para pesquisarmos no YouTube, quando o usuário apenas fornece o titulo do vídeo.

## 🤖 Comandos
-  `/ping` - Saber a latência do bot.
-  `/play` - Tocar uma música do YouTube, caso já tenha uma tocando, adicionar a música na fila e esperar a outra acabar.
-  `/skip` - Pular a música atual e ir para a próxima música da fila.
-  `/pause` - Pausar ou despausar a música atual.
-  `/resume` - Pausar ou despausar a música atual.

## ⚠️ Observações:
- Caso você encontre bugs ou quer melhorar algo nesses códigos de exemplos ou na explicação, sinta-se a vontade para abrir uma issue ou um PR.
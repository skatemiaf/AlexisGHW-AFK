const mineflayer = require('mineflayer');
const readline = require('readline');
const http = require('http');

const CONFIG = {
  host: 'infection.fun',
  port: 25565,
  username: 'AlexisGHW',
  password: 'Miaf,2020.',
  version: '1.21.8',
  reconnectDelay: 10000,
  maxConnectionAttempts: 10 // Límite de intentos de conexión
};

let bot;
let reconnecting = false;
let gensTimer = null;
let connectionAttempts = 0;
let stableTimer = null;

// Variables para el comando ?time
const startTime = Date.now();
let disconnectCount = 0;

function createBot() {
  connectionAttempts++;
  console.log(`Usuario > Conectando al servidor (Intento ${connectionAttempts}/${CONFIG.maxConnectionAttempts})...`);

  // Si superó los 10 intentos fallidos, apagar el proceso
  if (connectionAttempts > CONFIG.maxConnectionAttempts) {
    console.log('Error de Conexión > Se superó el límite de 10 intentos de conexión. Apagando bot...');
    process.exit(1);
  }

  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    auth: 'offline'
  });

  // Evento al aparecer en el servidor / lobby / modalidad
  bot.on('spawn', () => {
    console.log('Usuario > Apareció en un mundo/lobby.');

    // 1. Intentar /login cada vez que cambia de servidor/host
    setTimeout(() => {
      if (bot) {
        console.log('Usuario > Enviando /login...');
        bot.chat(`/login ${CONFIG.password}`);
      }
    }, 1500);

    // 2. Programar /gens 10 segundos después de teletransportarse
    if (gensTimer) clearTimeout(gensTimer);

    gensTimer = setTimeout(() => {
      if (bot && bot.entity) {
        console.log('Usuario > Ejecutando /gens...');
        bot.chat('/gens');
      }
    }, 10000);

    // Si logra quedarse conectado 30 segundos sin caerse, reseteamos el contador de intentos fallidos
    if (stableTimer) clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      if (bot && bot.entity) {
        connectionAttempts = 0; // Conexión estable confirmada
      }
    }, 30000);
  });

  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase();
    console.log('[CHAT]', msg);
  });

  // COMANDOS DEL CHAT EN JUEGO (?time y ?stop)
  bot.on('chat', (username, message) => {
    // Solo responde al dueño (AlexisGHW)
    if (username !== CONFIG.username) return;

    const msg = message.trim();

    // Comando ?time
    if (msg === '?time') {
      const uptimeMs = Date.now() - startTime;
      const totalSeconds = Math.floor(uptimeMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const respuesta = `Online: ${hours}h ${minutes}m ${seconds}s | Desconexiones: ${disconnectCount}`;
      bot.chat(respuesta);
      console.log(`Usuario >  ${respuesta}`);
    }

    // Comando ?stop
    if (msg === '?stop') {
      bot.chat('Apagando bot... ¡Nos vemos!');
      console.log('Usuario > Comando ?stop recibido. Apagando proceso...');
      setTimeout(() => {
        bot.quit();
        process.exit(0);
      }, 1000);
    }
  });

  bot.on('kicked', reason => {
    console.log('Usuario > Expulsado:', reason);
  });

  bot.on('error', err => {
    console.log('Usuario > Error:', err.message);
  });

  bot.on('end', () => {
    console.log('Usuario > Desconectado');
    disconnectCount++;
    if (gensTimer) clearTimeout(gensTimer);
    if (stableTimer) clearTimeout(stableTimer);
    reconnect();
  });
}

function reconnect() {
  if (reconnecting) return;
  reconnecting = true;

  console.log(`Usuario > Reintentando conectar en ${CONFIG.reconnectDelay / 1000}s...`);

  setTimeout(() => {
    reconnecting = false;
    createBot();
  }, CONFIG.reconnectDelay);
}

// 1. CONSOLA INTERACTIVA EN KOYEB / TERMINAL
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  const input = line.trim();
  if (!input) return;

  if (input === '?time') {
    const uptimeMs = Date.now() - startTime;
    const totalSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    console.log(`Estado > Online: ${hours}h ${minutes}m ${seconds}s | Desconexiones: ${disconnectCount} | Intentos: ${connectionAttempts}`);
    return;
  }

  if (input === '?stop') {
    console.log('Usuario > [BOT] Apagando bot desde la consola...');
    if (bot) bot.quit();
    process.exit(0);
  }

  if (bot && bot.entity) {
    bot.chat(input);
  } else {
    console.log('Usuario > El bot no está conectado actualmente.');
  }
});

// 2. SERVIDOR HTTP PARA MANTENER LA APP ACTIVA (Koyeb / UptimeRobot)
http.createServer((req, res) => {
  res.write("Bot AFK 24/7 activo");
  res.end();
}).listen(process.env.PORT || 3000);

// Iniciar el bot
createBot();
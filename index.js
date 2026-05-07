const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const qrcode = require('qrcode-terminal')
const express = require('express')

// Servidor web simple para que Koyeb esté feliz
const app = express()
app.get('/', (req, res) => res.send('Bot funcionando 24/7'))
app.listen(process.env.PORT || 8000)

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_auth')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Moderador", "Chrome", "1.0.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const debeReconectar = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (debeReconectar) iniciarBot()
        } else if (connection === 'open') {
            console.log('--- BOT CONECTADO ---')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return

        const texto = m.message.conversation || m.message.extendedTextMessage?.text || ""
        const esGrupo = m.key.remoteJid.endsWith('@g.us')

        if (esGrupo && (texto.includes('chat.whatsapp.com') || texto.includes('https://'))) {
            console.log("¡Link detectado! Expulsando...")
            await sock.groupParticipantsUpdate(m.key.remoteJid, [m.key.participant], "remove")
                .catch(() => console.log("Error al expulsar. ¿Soy admin?"))
        }
    })
}

iniciarBot()

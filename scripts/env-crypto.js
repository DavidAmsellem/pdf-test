const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const algorithm = 'aes-256-ctr';
const envFile = path.join(__dirname, '..', '.env');
const envEncFile = path.join(__dirname, '..', '.env.enc');

// Función para generar una clave a partir de una contraseña
function generateKey(password) {
    return crypto.scryptSync(password, 'salt', 32);
}

// Función para encriptar
function encrypt(text, password) {
    const key = generateKey(password);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
}

// Función para desencriptar
function decrypt(hash, password) {
    const key = generateKey(password);
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(hash.iv, 'hex'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(hash.content, 'hex')),
        decipher.final()
    ]);
    return decrypted.toString();
}

// Interfaz de línea de comandos
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askPassword() {
    return new Promise((resolve) => {
        rl.question('Introduce la contraseña de encriptación: ', (password) => {
            resolve(password);
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        if (command === 'encrypt') {
            if (!fs.existsSync(envFile)) {
                console.error('Error: No se encuentra el archivo .env');
                process.exit(1);
            }

            const password = await askPassword();
            const envContent = fs.readFileSync(envFile, 'utf8');
            const encrypted = encrypt(envContent, password);

            fs.writeFileSync(envEncFile, JSON.stringify(encrypted));
            console.log('✅ Variables de entorno encriptadas correctamente en .env.enc');

        } else if (command === 'decrypt') {
            if (!fs.existsSync(envEncFile)) {
                console.error('Error: No se encuentra el archivo .env.enc');
                process.exit(1);
            }

            const password = await askPassword();
            const encryptedData = JSON.parse(fs.readFileSync(envEncFile, 'utf8'));
            const decrypted = decrypt(encryptedData, password);

            fs.writeFileSync(envFile, decrypted);
            console.log('✅ Variables de entorno desencriptadas correctamente en .env');

        } else {
            console.log('Uso: node env-crypto.js [encrypt|decrypt]');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

main();

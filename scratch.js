const fs = require('fs');

function replaceFile(path, replacer) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
}

replaceFile('src/server.ts', c => c.replace('console.log(`🦊 MOTOR BOTMARE ACTIVADO`);', 'const brand = process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || \'BotMaRe\';\n        console.log(`🦊 MOTOR ${brand.toUpperCase()} ACTIVADO`);'));

replaceFile('src/telegram/bot.ts', c => {
    let nc = c.replace('Soy tu asistente maestro de *BotMaRe AI*', 'Soy tu asistente maestro de *${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || \'BotMaRe\'}*');
    nc = nc.replace(/\*BotMaRe Dashboard\*/g, '*${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || \'BotMaRe\'} Dashboard*');
    return nc;
});

replaceFile('src/config.ts', c => {
    let nc = c.replace(/name: "BotMaRe AI"/g, 'name: process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || "BotMaRe"');
    nc = nc.replace(/title: "BotMaRe AI"/g, 'title: process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || "BotMaRe"');
    return nc;
});

replaceFile('src/middleware/auth.middleware.ts', c => c.replace('realm="BotMaRe Dashboard"', 'realm="${process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || \'BotMaRe\'} Dashboard"'));

replaceFile('src/infrastructure/whatsapp/client.ts', c => c.replace("browser: ['BotMaRe AI', 'Chrome', '1.0.0']", "browser: [process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || 'BotMaRe', 'Chrome', '1.0.0']"));

replaceFile('src/app/manual/page.tsx', c => {
    let nc = c.replace('BotMaRe AI 2026', '{process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || "BotMaRe"} 2026');
    nc = nc.replace('Bienvenido al centro de conocimiento de BotMaRe', 'Bienvenido al centro de conocimiento de {process.env.NEXT_PUBLIC_SYSTEM_BRAND_NAME || "BotMaRe"}');
    return nc;
});

// Append to .env
if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    if (!envContent.includes('NEXT_PUBLIC_SYSTEM_BRAND_NAME')) {
        fs.appendFileSync('.env', '\n# MARCA DEL SISTEMA (Cambia esto para renombrar todo el bot y dashboard)\nNEXT_PUBLIC_SYSTEM_BRAND_NAME="BotMaRe"\n');
    }
}
if (fs.existsSync('.env.example')) {
    const envContent = fs.readFileSync('.env.example', 'utf8');
    if (!envContent.includes('NEXT_PUBLIC_SYSTEM_BRAND_NAME')) {
        fs.appendFileSync('.env.example', '\n# MARCA DEL SISTEMA\nNEXT_PUBLIC_SYSTEM_BRAND_NAME="BotMaRe"\n');
    }
}

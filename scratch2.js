const fs = require('fs');

function replaceFile(path, replacer) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
}

// Windows
replaceFile('setup.bat', c => {
    let nc = c.replace('call npm install', 'call npm install -g pnpm\ncall pnpm config set ignore-scripts false\ncall pnpm install');
    return nc;
});

replaceFile('manager.bat', c => {
    let nc = c.replace(/npm run dev/g, 'pnpm run dev');
    nc = nc.replace(/npm run build/g, 'pnpm run build');
    nc = nc.replace(/npm install/g, 'pnpm install');
    return nc;
});

replaceFile('actualizar.bat', c => {
    let nc = c.replace(/npm install/g, 'pnpm install');
    nc = nc.replace(/npm run build/g, 'pnpm run build');
    return nc;
});

// Linux/Mac
replaceFile('setup.sh', c => {
    let nc = c.replace('npm install', 'npm install -g pnpm\npnpm config set ignore-scripts false\npnpm install');
    return nc;
});

replaceFile('update.sh', c => {
    let nc = c.replace(/npm install/g, 'pnpm install');
    nc = nc.replace(/npm run build/g, 'pnpm run build');
    return nc;
});

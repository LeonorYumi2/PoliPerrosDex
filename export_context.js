const fs = require('fs');
const path = require('path');

// Nombre del archivo final que contendrÃ¡ todo tu cÃ³digo
const OUTPUT_FILE = 'contexto_proyecto.md';
const ROOT_DIR = __dirname;

// Carpetas que ignoramos porque son pesadas o no contienen cÃ³digo fuente Ãºtil
const IGNORE_DIRS = ['node_modules', '.expo', '.vscode', '.opencode', '.git', 'assets', '__tests__', '.tamagui'];

// Archivos especÃ­ficos que no queremos incluir
const IGNORE_FILES = ['package-lock.json', 'yarn.lock', OUTPUT_FILE, 'export_context.js'];

// Extensiones permitidas
const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'];

function buildContext(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(item)) {
                buildContext(itemPath);
            }
        } else {
            const ext = path.extname(item);
            const isAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
            
            // Permitimos archivos de configuraciÃ³n que empiezan con punto (ej. .gitignore, eslint.config.js)
            const isConfigFile = item.startsWith('.') || item.includes('config'); 

            if (!IGNORE_FILES.includes(item) && (isAllowedExtension || isConfigFile)) {
                try {
                    const content = fs.readFileSync(itemPath, 'utf8');
                    const relativePath = path.relative(ROOT_DIR, itemPath);
                    
                    // Separador visual claro para que la IA distinga entre archivos
                    const separator = `\n\n================================================\n`;
                    const fileHeader = `ðŸ“„ ARCHIVO: ${relativePath}\n================================================\n\n`;
                    
                    fs.appendFileSync(path.join(ROOT_DIR, OUTPUT_FILE), separator + fileHeader + content);
                } catch (error) {
                    console.error(`Error leyendo ${itemPath}:`, error.message);
                }
            }
        }
    }
}

// 1. Inicializar/Limpiar el archivo de salida
fs.writeFileSync(path.join(ROOT_DIR, OUTPUT_FILE), '# Contexto Completo del Proyecto CV-CREATOR-APP\n');
console.log('â³ Recopilando cÃ³digo...');

// 2. Ejecutar la lectura
buildContext(ROOT_DIR);

console.log(`âœ… Â¡Listo! Todo tu cÃ³digo se ha consolidado en el archivo: ${OUTPUT_FILE}`);
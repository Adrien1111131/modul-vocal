import fs from 'fs';
import path from 'path';

const indexPath = path.resolve('dist', 'index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

// Remplacer les chemins absolus par des chemins relatifs
content = content.replace(/src="\/assets\//g, 'src="./assets/');
content = content.replace(/href="\/assets\//g, 'href="./assets/');

fs.writeFileSync(indexPath, content);
console.log('Chemins corrigés dans index.html');

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'docs', 'openapi.yaml');

const file = fs.readFileSync(filePath, 'utf8');

const swaggerDocument = YAML.parse(file);

export default swaggerDocument;
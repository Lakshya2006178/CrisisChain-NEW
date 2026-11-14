import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve to server/.env regardless of where the process is started from
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });


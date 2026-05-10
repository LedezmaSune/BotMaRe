import { getAllConfig } from './src/core/config';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        const config = await getAllConfig();
        console.log('CONFIG:', JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();

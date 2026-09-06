import dotenv from 'dotenv';
dotenv.config();

import { runLLMDiagnostic } from '../src/core/llmTest';

async function main() {
    console.log('\n==================================================');
    console.log('🤖 DIAGNÓSTICO DE PROVEEDORES LLM (BotMaRe)');
    console.log('==================================================\n');

    const { results, summary } = await runLLMDiagnostic();

    let currentProvider = '';
    for (const r of results) {
        if (r.provider !== currentProvider) {
            currentProvider = r.provider;
            console.log(`\n🔍 ${r.provider} (Modelo: ${r.model})`);
        }
        if (r.success) {
            console.log(`   🟢 (${r.keyMasked}) - ÉXITO | Resp: "${r.reply}" | Latencia: ${r.latencyMs}ms`);
        } else {
            console.log(`   🔴 (${r.keyMasked}) - ERROR | Latencia: ${r.latencyMs}ms`);
            console.log(`      💡 Detalle: ${r.error}`);
        }
    }

    console.log('\n==================================================');
    console.log(summary.replace(/\*/g, ''));
    console.log('==================================================\n');
}

main().catch(console.error);

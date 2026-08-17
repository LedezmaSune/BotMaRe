"use client";
import React, { useState, useEffect } from 'react';
import { Webhook, Zap, Link as LinkIcon, Server, Copy, Check, Code, Shield } from 'lucide-react';

export default function WebhooksUI() {
    const [copied, setCopied] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'gas' | 'go' | 'node' | 'curl'>('gas');
    const [host, setHost] = useState('');
    
    // Configuración base
    const API_KEY = 'botmare_default_secret_key'; // En producción debería venir de un endpoint seguro
    const endpointUrl = `${host}/api/webhooks/incoming`;

    useEffect(() => {
        setHost(window.location.origin);
    }, []);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const snippets = {
        gas: `// Google Apps Script (GAS) - Google Sheets/Forms
function enviarWhatsApp() {
  var url = "${endpointUrl}?apikey=${API_KEY}";
  
  var payload = {
    "phone": "5215555555555",
    "message": "Hola desde Google Sheets! 📊"
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}`,
        go: `// Go (Golang)
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	url := "${endpointUrl}"
	payload := map[string]string{
		"phone":   "5215555555555",
		"message": "Hola desde Go! 🐹",
	}
	jsonValue, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", "${API_KEY}")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	fmt.Println("Enviado. Status:", resp.Status)
}`,
        node: `// Node.js (Axios / Fetch)
const axios = require('axios');

async function enviarMensaje() {
  try {
    const response = await axios.post('${endpointUrl}', {
      phone: '5215555555555',
      message: 'Hola desde Node.js! 🚀'
    }, {
      headers: {
        'x-api-key': '${API_KEY}',
        'Content-Type': 'application/json'
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}

enviarMensaje();`,
        curl: `# Bash / cURL (Zapier Custom Request)
curl -X POST "${endpointUrl}" \\
     -H "x-api-key: ${API_KEY}" \\
     -H "Content-Type: application/json" \\
     -d '{
           "phone": "5215555555555",
           "message": "Hola desde cURL! 💻"
         }'`
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Webhook className="w-8 h-8 text-emerald-500" />
                    Webhooks & API
                </h1>
                <p className="text-slate-400 mt-2">
                    Conecta BotMaRe con cientos de aplicaciones externas usando Zapier, Make, Google Sheets o tu propio código.
                </p>
            </header>

            {/* Credenciales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="premium-glass p-6 rounded-2xl border border-app-border/30">
                    <div className="flex items-center gap-2 mb-4">
                        <LinkIcon className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-bold text-white">Endpoint URL</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                        <code className="text-sm text-blue-300 flex-1 truncate">{endpointUrl}</code>
                        <button 
                            onClick={() => handleCopy(endpointUrl, 'url')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {copied === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                    </div>
                </div>

                <div className="premium-glass p-6 rounded-2xl border border-app-border/30">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-orange-400" />
                        <h2 className="text-lg font-bold text-white">API Key de Seguridad</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                        <code className="text-sm text-orange-300 flex-1 font-mono">
                            ••••••••••••••••••••{API_KEY.slice(-4)}
                        </code>
                        <button 
                            onClick={() => handleCopy(API_KEY, 'key')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {copied === 'key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Puedes enviarla en la cabecera <code className="text-slate-300">x-api-key</code> o como parámetro URL <code className="text-slate-300">?apikey=</code>.
                    </p>
                </div>
            </div>

            {/* Snippets de Código */}
            <div className="premium-glass rounded-2xl border border-app-border/30 overflow-hidden flex flex-col flex-1 min-h-[400px]">
                <div className="flex border-b border-app-border/30 bg-black/20">
                    {[
                        { id: 'gas', label: 'Google Apps Script' },
                        { id: 'go', label: 'Go (Golang)' },
                        { id: 'node', label: 'Node.js' },
                        { id: 'curl', label: 'cURL / Zapier' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === tab.id 
                                    ? 'border-emerald-500 text-emerald-400 bg-white/5' 
                                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 bg-[#0d1117] p-6">
                    <button 
                        onClick={() => handleCopy(snippets[activeTab], 'snippet')}
                        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs text-white"
                    >
                        {copied === 'snippet' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copied === 'snippet' ? 'Copiado!' : 'Copiar código'}
                    </button>
                    <pre className="text-sm text-slate-300 font-mono overflow-x-auto h-full">
                        <code>{snippets[activeTab]}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
}

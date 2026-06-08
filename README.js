# n8nportafolio

{
  "name": "EntregablePortafolioSistIntel",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 13 * * 1-5"
            }
          ]
        }
      },
      "id": "2c0ff150-d228-43cd-8920-ea3e3e9b86c3",
      "name": "Trigger 8AM Bogota Lun-Vie1",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [
        -272,
        672
      ]
    },
    {
      "parameters": {
        "url": "http://127.0.0.1:8080/analizar",
        "options": {
          "response": {
            "response": {}
          },
          "timeout": 600000
        }
      },
      "id": "2f659581-be38-45e3-ab24-089e53f316e7",
      "name": "Llamar API Smart Portfolio1",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        -32,
        672
      ]
    },
    {
      "parameters": {
        "jsCode": "const items = $input.all().map(i => i.json);\nconst compras = items.filter(r => r['Señal'] === 'COMPRA' || r['Señal'] === 'COMPRA FUERTE');\n\nlet prompt_data = \"No hay señales de compra hoy.\";\nif (compras.length > 0) {\n  prompt_data = compras.map(c => `- ${c.Ticker} (${c.Sector}): Precio $${c.Precio}, RSI ${c.RSI}, Retorno 6M ${c['Retorno 6M (%)']}%, P/E ${c['P/E'] || 'N/A'}`).join('\\n');\n}\n\nreturn [{ json: { prompt_data } }];"
      },
      "id": "9be9848f-7cc7-4fbf-bab5-a89555bf441c",
      "name": "Preparar Prompt IA1",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        224,
        672
      ]
    },
    {
      "parameters": {
        "jsCode": "// Extraer datos originales de la API usando n8n item linking ($items)\nconst apiItems = $items(\"Llamar API Smart Portfolio1\");\nif (!apiItems || apiItems.length === 0) {\n  throw new Error('La API no devolvió datos válidos');\n}\nconst data = apiItems.map(item => item.json);\n\n// Extraer texto del AI Agent\nlet ai_explanation = \"El análisis automatizado con IA no se pudo generar hoy.\";\nconst iaNode = $input.first() ? $input.first().json : null;\n\nif (iaNode && iaNode.output) {\n  ai_explanation = iaNode.output;\n} else if (iaNode && iaNode.text) {\n  ai_explanation = iaNode.text;\n} else {\n  ai_explanation = \"El Agente IA no devolvió un texto válido. Revisa su salida.\";\n}\n\n// Convertir Markdown básico a HTML\nai_explanation = ai_explanation.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');\n\n// Filtros y conteos\nconst comprasFiltradas = data.filter(r => r['Señal'] === 'COMPRA' || r['Señal'] === 'COMPRA FUERTE');\nconst totalCompras = comprasFiltradas.length;\nconst totalEvitar = data.filter(r => r['Señal'] === 'EVITAR').length;\n\n// Sentimiento\nlet sentimiento = \"NEUTRAL ⚖️\";\nlet colorSentimiento = \"#fbbf24\";\nlet bgSentimiento = \"rgba(251,191,36,0.15)\";\nif (totalCompras > totalEvitar * 1.2) {\n  sentimiento = \"ALCISTA 🚀\";\n  colorSentimiento = \"#4ade80\";\n  bgSentimiento = \"rgba(74,222,128,0.15)\";\n} else if (totalEvitar > totalCompras * 1.2) {\n  sentimiento = \"BAJISTA 🐻\";\n  colorSentimiento = \"#f87171\";\n  bgSentimiento = \"rgba(248,113,113,0.15)\";\n}\n\nconst hoy = new Date().toLocaleDateString('es-CO', {\n  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'\n});\n\nconst señalColor = s => s === 'COMPRA FUERTE' ? '#16a34a' : s === 'COMPRA' ? '#2563eb' : s === 'NEUTRAL' ? '#d97706' : '#dc2626';\n\nconst renderBar = (score) => {\n  const percent = Number(score) * 100;\n  let color = '#dc2626';\n  if (percent >= 70) color = '#16a34a';\n  else if (percent >= 55) color = '#d97706';\n  return `<div style=\"width:100%; background:#e2e8f0; border-radius:4px; height:6px; margin-top:6px; overflow:hidden;\">\n            <div style=\"width:${percent}%; background:${color}; height:100%; border-radius:4px;\"></div>\n          </div>`;\n};\n\nconst renderFila = (r) => `\n  <tr style=\"border-bottom:1px solid #e2e8f0; transition: background 0.2s;\">\n    <td style=\"padding:14px;font-weight:800;color:#0f172a;\">${r.Ticker}</td>\n    <td style=\"padding:14px;color:#475569;font-weight:500;\">${r.Empresa || '-'}</td>\n    <td style=\"padding:14px;color:#64748b;font-size:12px;\">${r.Sector || '-'}</td>\n    <td style=\"padding:14px;text-align:right;font-weight:700;color:#0f172a;\">${r.Precio != null ? '$'+Number(r.Precio).toLocaleString('en-US',{minimumFractionDigits:2}) : '-'}</td>\n    <td style=\"padding:14px;text-align:right;font-weight:600;color:${r['Retorno 6M (%)']>0?'#16a34a':'#dc2626'}\">${r['Retorno 6M (%)'] != null ? (Number(r['Retorno 6M (%)'])>0?'+':'')+Number(r['Retorno 6M (%)']).toFixed(1)+'%' : '-'}</td>\n    <td style=\"padding:14px;text-align:right;width:100px;\">\n      <span style=\"font-weight:800;color:#0f172a;\">${r['Smart Score'] != null ? (Number(r['Smart Score'])*100).toFixed(1)+'%' : '-'}</span>\n      ${r['Smart Score'] != null ? renderBar(r['Smart Score']) : ''}\n    </td>\n    <td style=\"padding:14px;text-align:center;\"><span style=\"background:${señalColor(r['Señal'])};color:#fff;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:0.5px;box-shadow:0 2px 4px rgba(0,0,0,0.1)\">${r['Señal']}</span></td>\n  </tr>`;\n\n// Solo UNA lista: Todas las empresas\nconst filaTodas = data.map(renderFila).join('');\n\nconst html = `<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif\">\n<div style=\"max-width:960px;margin:0 auto;padding:24px\">\n\n<!-- Header Principal -->\n<div style=\"background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);border-radius:20px 20px 0 0;padding:40px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1)\">\n  <div style=\"display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px\">\n    <div>\n      <h1 style=\"margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:-0.5px\">📈 Smart Portfolio</h1>\n      <p style=\"margin:8px 0 0;color:#94a3b8;font-size:15px;font-weight:500\">Reporte Algorítmico · ${hoy}</p>\n    </div>\n    <div style=\"background:${bgSentimiento}; border:1px solid ${colorSentimiento}; padding:10px 20px; border-radius:30px; text-align:center\">\n      <p style=\"margin:0;color:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.8\">Sentimiento Global</p>\n      <p style=\"margin:4px 0 0;color:${colorSentimiento};font-size:16px;font-weight:800\">${sentimiento}</p>\n    </div>\n  </div>\n\n  <!-- Tarjetas de Métricas -->\n  <div style=\"display:flex;gap:16px;margin-top:36px;flex-wrap:wrap\">\n    <div style=\"background:rgba(255,255,255,0.06);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;flex:1;min-width:120px\">\n      <p style=\"margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;font-weight:600\">Analizados</p>\n      <p style=\"margin:8px 0 0;color:#f8fafc;font-size:32px;font-weight:900\">${data.length}</p>\n    </div>\n    <div style=\"background:rgba(22,163,74,0.15);border:1px solid rgba(22,163,74,0.4);border-radius:16px;padding:20px;flex:1;min-width:120px\">\n      <p style=\"margin:0;color:#86efac;font-size:12px;text-transform:uppercase;font-weight:600\">Compra Fuerte</p>\n      <p style=\"margin:8px 0 0;color:#4ade80;font-size:32px;font-weight:900\">${data.filter(r=>r['Señal']==='COMPRA FUERTE').length}</p>\n    </div>\n    <div style=\"background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.4);border-radius:16px;padding:20px;flex:1;min-width:120px\">\n      <p style=\"margin:0;color:#93c5fd;font-size:12px;text-transform:uppercase;font-weight:600\">Compra</p>\n      <p style=\"margin:8px 0 0;color:#60a5fa;font-size:32px;font-weight:900\">${totalCompras}</p>\n    </div>\n    <div style=\"background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);border-radius:16px;padding:20px;flex:1;min-width:120px\">\n      <p style=\"margin:0;color:#fca5a5;font-size:12px;text-transform:uppercase;font-weight:600\">Evitar</p>\n      <p style=\"margin:8px 0 0;color:#f87171;font-size:32px;font-weight:900\">${totalEvitar}</p>\n    </div>\n  </div>\n</div>\n\n<!-- Panel Premium de Inteligencia Artificial -->\n<div style=\"background:#ffffff;padding:36px 40px;margin-top:2px;border-left:5px solid #8b5cf6;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05)\">\n  <div style=\"display:flex;align-items:center;gap:12px;margin-bottom:20px\">\n    <div style=\"background:#ede9fe;color:#8b5cf6;padding:8px;border-radius:12px\">\n      <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/></svg>\n    </div>\n    <h2 style=\"margin:0;color:#0f172a;font-size:20px;font-weight:900\">AI Market Insight</h2>\n  </div>\n  <p style=\"margin:0;color:#334155;font-size:15px;line-height:1.7;font-weight:500\">\n    ${ai_explanation}\n  </p>\n</div>\n\n<!-- Tabla Completa Analizada -->\n<div style=\"background:#ffffff;padding:36px 40px;margin-top:24px;border-radius:20px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05)\">\n  <h2 style=\"margin:0 0 24px;color:#0f172a;font-size:20px;font-weight:900;display:flex;align-items:center;gap:10px\">📋 Lista Completa Analizada</h2>\n  <div style=\"overflow-x:auto\">\n    <table style=\"width:100%;border-collapse:collapse;font-size:14px\">\n      <thead><tr style=\"background:#f8fafc\">\n        <th style=\"padding:16px 14px;text-align:left;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Ticker</th>\n        <th style=\"padding:16px 14px;text-align:left;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Empresa</th>\n        <th style=\"padding:16px 14px;text-align:left;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Sector</th>\n        <th style=\"padding:16px 14px;text-align:right;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Precio</th>\n        <th style=\"padding:16px 14px;text-align:right;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Ret. 6M</th>\n        <th style=\"padding:16px 14px;text-align:right;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Smart Score</th>\n        <th style=\"padding:16px 14px;text-align:center;color:#64748b;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;border-bottom:2px solid #e2e8f0\">Acción</th>\n      </tr></thead>\n      <tbody>${filaTodas}</tbody>\n    </table>\n  </div>\n</div>\n\n<div style=\"margin-top:30px;padding:24px;text-align:center\">\n  <p style=\"margin:0;color:#94a3b8;font-size:13px;font-weight:500\">\n    Generado algorítmicamente y enriquecido con IA · <strong>Smart Portfolio</strong><br>\n    <span style=\"opacity:0.8\">Este reporte es estrictamente informativo y no constituye asesoría financiera.</span>\n  </p>\n</div>\n\n</div></body></html>`;\n\nconst tickers_compra = comprasFiltradas.map(r => r.Ticker).join(', ') || 'Ninguno';\nreturn [{ json: { html, subject: `📈 Smart Portfolio ${new Date().toLocaleDateString('es-CO')} · Compras: ${tickers_compra} · Sentimiento: ${sentimiento}`, total: data.length, compras: comprasFiltradas.length } }];"
      },
      "id": "85d3078d-253f-42fb-a3d1-3eed8c4caf39",
      "name": "Construir Email HTML1",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        832,
        672
      ]
    },
    {
      "parameters": {
        "sendTo": "bolarte@unal.edu.co",
        "subject": "={{ $json.subject }}",
        "message": "={{ $json.html }}",
        "options": {}
      },
      "id": "7c8e73dd-ef22-4934-80f8-74c57b451ab2",
      "name": "Enviar por Gmail1",
      "type": "n8n-nodes-base.gmail",
      "typeVersion": 2.1,
      "position": [
        1072,
        672
      ],
      "webhookId": "522bf95a-6684-4f34-bc17-ccf61781592e",
      "credentials": {
        "gmailOAuth2": {
          "id": "ySq1BccUh0u1mrvg",
          "name": "Gmail account"
        }
      }
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "=={{ $json.prompt_data }}\n",
        "options": {
          "systemMessage": "Actúa como un analista financiero de un fondo de cobertura elite. Escribe 2 párrafos cortos y altamente persuasivos explicando por qué las acciones recomendadas son excelentes oportunidades de compra hoy, basándote en sus indicadores técnicos y fundamentales. Usa un tono premium, sofisticado y directo. No uses saludos ni despedidas, ve directo al análisis. Utiliza negritas para resaltar nombres o métricas clave. Si no hay empresas en la lista, indica que hoy es mejor mantener la cautela y proteger el capital."
        }
      },
      "id": "f5657a6d-24f4-4283-9437-954777a543cb",
      "name": "AI Agent1",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.6,
      "position": [
        464,
        672
      ]
    },
    {
      "parameters": {
        "model": "llama-3.3-70b-versatile",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatGroq",
      "typeVersion": 1,
      "position": [
        336,
        880
      ],
      "id": "e3141ff7-7a9f-40c7-9ef2-02c154425944",
      "name": "Groq Chat Model",
      "credentials": {
        "groqApi": {
          "id": "EdnpX3pL0r94l6ue",
          "name": "Groq account"
        }
      }
    }
  ],
  "pinData": {},
  "connections": {
    "Trigger 8AM Bogota Lun-Vie1": {
      "main": [
        [
          {
            "node": "Llamar API Smart Portfolio1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Llamar API Smart Portfolio1": {
      "main": [
        [
          {
            "node": "Preparar Prompt IA1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Preparar Prompt IA1": {
      "main": [
        [
          {
            "node": "AI Agent1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Construir Email HTML1": {
      "main": [
        [
          {
            "node": "Enviar por Gmail1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Agent1": {
      "main": [
        [
          {
            "node": "Construir Email HTML1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Groq Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent1",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1",
    "binaryMode": "separate"
  },
  "versionId": "4686140e-7c42-471b-bdde-68bc18f80565",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "399b263071a54629c8c3882511c8d31976ea8d82ce1f7c31d096d566e0316e77"
  },
  "nodeGroups": [],
  "id": "E1N9GIgZjBfuDNxY",
  "tags": []
}

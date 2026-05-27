// OCR de documentos brasileiros via Groq (Llama 3.2 Vision, free tier)
// Recebe imagem base64, retorna dados estruturados

const SYSTEM_PROMPT = `Voce e um OCR de documentos brasileiros. Analise a foto e extraia os dados em formato JSON.

Responda APENAS com o JSON, sem texto antes ou depois, sem explicacoes, sem markdown. So o objeto JSON.

Schema obrigatorio (todos os campos, use null quando nao encontrar):
{"tipo":"RG|CIN|CPF|CNH|PASSAPORTE|TITULO_ELEITOR|CERTIDAO_NASCIMENTO|CERTIDAO_CASAMENTO|CARTEIRA_TRABALHO|CARTEIRA_VACINACAO|OUTRO","nome":"nome completo ou null","numero":"so digitos ou null","cpf":"so digitos ou null","data_nascimento":"YYYY-MM-DD ou null","data_emissao":"YYYY-MM-DD ou null","data_vencimento":"YYYY-MM-DD ou null","orgao_emissor":"sigla ou null","categoria":"categoria CNH ou null","observacoes":"info extra ou null","confianca":"alta|media|baixa"}

Regras importantes:
- Numeros sem formatacao (so digitos, sem pontos/tracos)
- Datas no formato YYYY-MM-DD (ex: 2025-03-15)
- Se nao for documento, tipo="OUTRO" e confianca="baixa"
- Sempre retorne o JSON completo, mesmo com varios campos null`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mediaType } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Imagem obrigatoria' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY nao configurada no Vercel' });

  const mt = mediaType || 'image/jpeg';
  const dataUrl = `data:${mt};base64,${image}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SYSTEM_PROMPT + '\n\nAnalise a imagem e responda APENAS com o JSON dos dados extraidos.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const raw = data.choices?.[0]?.message?.content || '{}';

    // Parser defensivo: extrai JSON do meio do texto se necessario
    let parsed;
    try {
      // 1. Tenta direto
      parsed = JSON.parse(raw);
    } catch (_) {
      // 2. Remove markdown fences
      let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (_) {
        // 3. Extrai primeiro bloco { ... } do texto
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); }
          catch (_) { return res.status(500).json({ error: 'Resposta da IA nao foi JSON valido', raw }); }
        } else {
          return res.status(500).json({ error: 'Resposta da IA sem JSON', raw });
        }
      }
    }

    return res.status(200).json({ data: parsed, _raw: raw });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

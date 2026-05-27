// OCR de documentos brasileiros via Groq (Llama 3.2 Vision, free tier)
// Recebe imagem base64, retorna dados estruturados

const SYSTEM_PROMPT = `Voce e um OCR especializado em documentos brasileiros. Analise a foto e extraia os dados.
Retorne SOMENTE um JSON valido (sem markdown, sem texto antes ou depois) com este schema exato:
{
  "tipo": "RG" ou "CIN" ou "CPF" ou "CNH" ou "PASSAPORTE" ou "TITULO_ELEITOR" ou "CERTIDAO_NASCIMENTO" ou "CERTIDAO_CASAMENTO" ou "CARTEIRA_TRABALHO" ou "CARTEIRA_VACINACAO" ou "OUTRO",
  "nome": string ou null,
  "numero": string ou null,
  "cpf": string ou null,
  "data_nascimento": "YYYY-MM-DD" ou null,
  "data_emissao": "YYYY-MM-DD" ou null,
  "data_vencimento": "YYYY-MM-DD" ou null,
  "orgao_emissor": string ou null,
  "categoria": string ou null,
  "observacoes": string ou null,
  "confianca": "alta" ou "media" ou "baixa"
}

Use null para campos nao identificados. Numeros sem formatacao (so digitos). Se nao for documento, retorne tipo="OUTRO" e confianca="baixa".`;

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
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SYSTEM_PROMPT + '\n\nExtraia os dados desse documento e retorne SOMENTE o JSON.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const raw = data.choices?.[0]?.message?.content || '{}';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) { return res.status(500).json({ error: 'Resposta da IA nao foi JSON valido', raw }); }

    return res.status(200).json({ data: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// OCR de documentos brasileiros via Claude Vision
// Recebe imagem base64 e retorna dados estruturados (tipo, nome, numero, validade etc)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mediaType } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Imagem obrigatoria' });

  const mt = mediaType || 'image/jpeg';

  const systemPrompt = `Voce e um OCR especializado em documentos brasileiros. Analise a foto e extraia os dados.
Retorne SOMENTE um JSON valido (sem markdown, sem texto antes ou depois) com este schema:
{
  "tipo": "RG" | "CIN" | "CPF" | "CNH" | "PASSAPORTE" | "TITULO_ELEITOR" | "CERTIDAO_NASCIMENTO" | "CERTIDAO_CASAMENTO" | "CARTEIRA_TRABALHO" | "CARTEIRA_VACINACAO" | "OUTRO",
  "nome": string | null,        // nome completo da pessoa
  "numero": string | null,       // numero do documento sem formatacao
  "cpf": string | null,          // se aparecer, sem formatacao (so digitos)
  "data_nascimento": "YYYY-MM-DD" | null,
  "data_emissao": "YYYY-MM-DD" | null,
  "data_vencimento": "YYYY-MM-DD" | null,
  "orgao_emissor": string | null, // sigla (SSP-BA, DETRAN-BA, etc)
  "categoria": string | null,    // categoria CNH (A, B, AB, etc) ou similar
  "observacoes": string | null,  // qualquer info extra relevante
  "confianca": "alta" | "media" | "baixa" // sua confianca na extracao
}

Use null para campos nao identificados. Se a foto nao parece ser um documento, retorne tipo="OUTRO" e confianca="baixa".`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mt, data: image } },
            { type: 'text', text: 'Extraia os dados desse documento e retorne o JSON.' }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const raw = data.content?.[0]?.text || '{}';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) { return res.status(500).json({ error: 'Resposta da IA nao foi JSON valido', raw }); }

    return res.status(200).json({ data: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

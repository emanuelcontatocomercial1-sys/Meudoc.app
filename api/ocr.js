// OCR de documentos brasileiros via Google Gemini Vision (gratis)
// Recebe imagem base64, retorna dados estruturados

const SYSTEM_PROMPT = `Voce e um OCR especializado em documentos brasileiros. Analise a foto e extraia os dados.
Retorne SOMENTE um JSON valido (sem markdown, sem texto antes ou depois) com este schema exato:
{
  "tipo": "RG" | "CIN" | "CPF" | "CNH" | "PASSAPORTE" | "TITULO_ELEITOR" | "CERTIDAO_NASCIMENTO" | "CERTIDAO_CASAMENTO" | "CARTEIRA_TRABALHO" | "CARTEIRA_VACINACAO" | "OUTRO",
  "nome": string | null,
  "numero": string | null,
  "cpf": string | null,
  "data_nascimento": "YYYY-MM-DD" | null,
  "data_emissao": "YYYY-MM-DD" | null,
  "data_vencimento": "YYYY-MM-DD" | null,
  "orgao_emissor": string | null,
  "categoria": string | null,
  "observacoes": string | null,
  "confianca": "alta" | "media" | "baixa"
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY nao configurada no Vercel' });

  const mt = mediaType || 'image/jpeg';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: mt, data: image } },
            { text: 'Extraia os dados desse documento e retorne o JSON.' }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) { return res.status(500).json({ error: 'Resposta da IA nao foi JSON valido', raw }); }

    return res.status(200).json({ data: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

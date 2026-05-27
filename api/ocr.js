// OCR de documentos brasileiros via Groq (Llama 3.2 Vision, free tier)
// Recebe imagem base64, retorna dados estruturados

const SYSTEM_PROMPT = `Voce e OCR especializado em documentos brasileiros. Retorne APENAS o JSON, sem texto antes/depois, sem markdown.

Schema obrigatorio (todos os campos, use null quando nao encontrar):
{"tipo":"RG|CIN|CPF|CNH|PASSAPORTE|TITULO_ELEITOR|CERTIDAO_NASCIMENTO|CERTIDAO_CASAMENTO|CARTEIRA_TRABALHO|CARTEIRA_VACINACAO|OUTRO","nome":"nome completo","numero":"so digitos","cpf":"so digitos","data_nascimento":"YYYY-MM-DD","data_emissao":"YYYY-MM-DD","data_vencimento":"YYYY-MM-DD","orgao_emissor":"SIGLA-UF","categoria":"...","observacoes":"...","confianca":"alta|media|baixa"}

REGRAS CRITICAS:

1) SEPARAR numero do orgao emissor:
   - numero = APENAS digitos do RG/CNH/CPF (sem letras, sem pontos, sem tracos, sem UF)
   - orgao_emissor = sigla do orgao + UF (ex: "SSP-MG", "PC-BA", "DETRAN-SP")
   - NUNCA coloque a UF no campo numero
   - NUNCA coloque so a UF no orgao_emissor — sempre orgao+UF

2) Por tipo de documento:
   - RG/CIN: numero = so os digitos brasileiros (ex: "23660376"). orgao_emissor tipico: "SSP-XX" ou "PC-XX"
   - CNH: numero = 11 digitos. orgao_emissor SEMPRE "DETRAN-XX". categoria = letra(s) (A, B, AB, etc)
   - CPF: numero = 11 digitos. orgao_emissor null ou "RFB"
   - Passaporte: numero = alfanumerico (ex: "FE234567"). orgao_emissor = "PF" ou "POLICIA FEDERAL"
   - Titulo de Eleitor: numero = 12 digitos. orgao_emissor = "TSE"

3) Datas:
   - SEMPRE no formato YYYY-MM-DD
   - Converta DD/MM/YYYY ou DD.MM.YYYY para esse formato
   - Ex: 18/12/2019 vira "2019-12-18"

4) Nome: completo, em CAIXA ALTA se aparecer assim no doc, ou capitalizado

5) Se nao for documento conhecido: tipo="OUTRO", confianca="baixa"

EXEMPLO de saida correta pra um RG mineiro com numero "23.660.376" emitido pela SSP-MG:
{"tipo":"RG","nome":"JOAO DA SILVA","numero":"23660376","cpf":null,"data_nascimento":"1990-05-12","data_emissao":"2019-12-18","data_vencimento":null,"orgao_emissor":"SSP-MG","categoria":null,"observacoes":null,"confianca":"alta"}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Aceita tanto formato antigo {image, mediaType} quanto novo {images: [{data, mediaType}]}
  const body = req.body || {};
  let images = [];
  if (Array.isArray(body.images) && body.images.length > 0) {
    images = body.images.map(i => ({
      data: i.data || i.image,
      mediaType: i.mediaType || 'image/jpeg'
    }));
  } else if (body.image) {
    images = [{ data: body.image, mediaType: body.mediaType || 'image/jpeg' }];
  }
  if (images.length === 0) return res.status(400).json({ error: 'Pelo menos uma imagem e obrigatoria' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY nao configurada no Vercel' });

  // Monta o content multi-imagem (frente + verso ou mais)
  const imageContent = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mediaType};base64,${img.data}` }
  }));

  const promptText = images.length > 1
    ? `${SYSTEM_PROMPT}\n\nVoce esta vendo ${images.length} fotos do MESMO documento (ex: frente e verso). CONSOLIDE as informacoes de todas as fotos em UM unico JSON. Cada foto pode trazer dados diferentes (frente: foto+nome+numero; verso: filiacao+observacoes; assim por diante). Responda APENAS com o JSON.`
    : `${SYSTEM_PROMPT}\n\nAnalise a imagem e responda APENAS com o JSON dos dados extraidos.`;

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
              { type: 'text', text: promptText },
              ...imageContent
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

// Chat IA da Bia via Groq (free tier generoso, formato OpenAI compativel)
// Env var: GROQ_API_KEY (https://console.groq.com/keys)

const SYSTEM_PROMPT = `Voce e a Bia, a assistente de documentos do MeuDoc.app — uma plataforma brasileira que ajuda cidadaos a resolverem qualquer questao documental.

Seu papel: responder perguntas sobre documentos brasileiros de forma clara, simples e direta, como uma amiga que entende bem de burocracia.

IMPORTANTE: Se ainda nao souber o nome da pessoa, pergunte ao inicio. Depois de saber, chame-a pelo nome em todas as respostas. Isso cria proximidade e confianca.

Para cada duvida sobre documento, responda na seguinte estrutura:
1. O que e necessario (documentos, requisitos)
2. Onde fazer (orgao responsavel)
3. Como fazer (passo a passo simples)
4. Quanto custa (valores aproximados em reais)
5. Quanto tempo leva (prazo medio)

Use linguagem simples, sem juridiques. Evite emojis em excesso. Seja concisa mas completa. Nao use travessoes duplos.

Se o usuario mencionar uma cidade especifica, personalize a resposta para aquela localidade.

Documentos que voce conhece bem: CIN/RG, CPF, CNH, Passaporte (primeira emissao, renovacao e urgencia), Certidao de Nascimento, Certidao de Casamento, INSS, MEI, CNPJ, Carteira de Trabalho, Titulo de Eleitor, Certidao de Obito, Carteira de Vacinacao, e outros documentos brasileiros.

Responda SEMPRE em portugues do Brasil.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid request' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY nao configurada no Vercel' });

  // Formato OpenAI compativel
  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: fullMessages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const text = data.choices?.[0]?.message?.content || 'Nao consegui responder agora. Tenta de novo?';
    return res.status(200).json({ content: text });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

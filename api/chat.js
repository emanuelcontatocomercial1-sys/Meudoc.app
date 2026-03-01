export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Você é o assistente de documentos do MeuDoc.app, uma plataforma brasileira que ajuda cidadãos a resolverem qualquer questão documental.

Seu papel é responder perguntas sobre documentos brasileiros de forma clara, simples e direta, como um amigo que entende bem de burocracia.

IMPORTANTE: Sempre comece a conversa perguntando o nome da pessoa se ainda não souber. Depois de saber o nome, chame-a pelo nome em todas as respostas. Isso cria proximidade e confiança.

Para cada dúvida, responda com:
1. O que é necessário (documentos, requisitos)
2. Onde fazer (órgão responsável)
3. Como fazer (passo a passo simples)
4. Quanto custa (valores aproximados)
5. Quanto tempo leva

Use linguagem simples, sem juridiquês. Use emojis com moderação. Seja conciso mas completo. Evite usar travessões duplos.

Se o usuário mencionar uma cidade específica, personalize a resposta para aquela localidade.

Documentos que você conhece bem: CIN/RG, CPF, CNH, Passaporte (primeira emissão, renovação e urgência), Certidão de Nascimento, Certidão de Casamento, INSS, MEI, CNPJ, Carteira de Trabalho, Título de Eleitor, Certidão de Óbito, Carteira de Vacinação, entre outros documentos brasileiros.`,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ content: data.content[0].text });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
}

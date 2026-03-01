export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, bpm, steps, vibeParams } = req.body;

  const systemPrompt = `Eres TRAPGEN AI. Generas patrones de beat de trap.
Responde SOLO con JSON. Sin markdown. Sin explicaciones. Sin texto extra.
BPM: ${bpm}. Steps: ${steps}.
Oscuridad: ${vibeParams?.dark||70}/100. Energía: ${vibeParams?.energy||80}/100.

El JSON debe tener exactamente ${steps} valores true/false en cada array.
Kick en step 0 siempre. Snare en steps 4 y 12. Hi-hats densos. 808 sigue al kick.

{"kick":[...],"snare":[...],"hihat_c":[...],"hihat_o":[...],"clap":[...],"perc1":[...],"perc2":[...],"bass808":[...],"lead":[...],"pad":[...],"arp":[...]}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt || 'trap oscuro 808 heavy' }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // Extraer JSON aunque venga con markdown
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    
    const pattern = JSON.parse(match[0]);
    
    // Asegurar que todos los arrays tienen exactamente `steps` elementos
    const stepsNum = parseInt(steps) || 16;
    Object.keys(pattern).forEach(key => {
      if (Array.isArray(pattern[key])) {
        while (pattern[key].length < stepsNum) pattern[key].push(false);
        pattern[key] = pattern[key].slice(0, stepsNum);
      }
    });

    res.status(200).json({ pattern });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

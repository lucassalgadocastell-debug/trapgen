export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, bpm, steps, vibeParams } = req.body;

  const systemPrompt = `Eres TRAPGEN AI, el mejor generador de patrones de beat de trap del mundo. Piensas como Metro Boomin, Southside y Wheezy.

REGLAS:
- Responde ÚNICAMENTE con JSON válido. Sin texto extra. Sin markdown. Sin explicaciones.
- Kick: step 0 siempre, step 8 casi siempre, variaciones sincopadas
- Snare: steps 4 y 12 son sagrados
- Hi-hats: densos y rápidos, triplete cuando pida energía
- 808 bass: sigue al kick, es el alma del trap
- Dark trap: más espacio, menos densidad
- Phonk: kick sincopado, hh ultra rápido
- Melodic: lead activo, pad suave
- Hard: kick doble, hh muy denso
- BPM: ${bpm}, Steps: ${steps}
- Oscuridad: ${vibeParams?.dark||70}/100, Energía: ${vibeParams?.energy||80}/100, Melodía: ${vibeParams?.melody||55}/100, 808: ${vibeParams?.bass808||90}/100

RESPONDE SOLO CON ESTE JSON (exactamente ${steps} valores true/false en cada array):
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
          { role: 'user', content: prompt || 'trap oscuro 808 heavy hi-hats rápidos' }
        ],
        temperature: 0.8,
        max_tokens: 512
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const pattern = JSON.parse(clean);
    res.status(200).json({ pattern });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Generation failed' });
  }
}

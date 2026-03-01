export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, steps } = req.body;
  const n = parseInt(steps) || 16;

  function fallbackPattern() {
    const empty = () => Array(n).fill(false);
    const pattern = {
      kick: empty(), snare: empty(), hihat_c: empty(), hihat_o: empty(),
      clap: empty(), perc1: empty(), perc2: empty(), bass808: empty(),
      lead: empty(), pad: empty(), arp: empty()
    };
    pattern.kick[0] = true;
    if (n>8) pattern.kick[8] = true;
    if (n>4) pattern.snare[4] = true;
    if (n>12) pattern.snare[12] = true;
    for(let i=0;i<n;i+=2) pattern.hihat_c[i]=true;
    pattern.bass808 = [...pattern.kick];
    return pattern;
  }

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
          {
            role: 'system',
            content: 'You are a professional trap producer AI. Generate trap beats as JSON only.'
          },
          {
            role: 'user',
            content: `Generate a trap beat pattern as JSON.
Style: ${prompt || 'dark trap 808 heavy hi-hats'}.
Keys: kick, snare, hihat_c, hihat_o, clap, perc1, perc2, bass808, lead, pad, arp.
Each key must have exactly ${n} boolean values (true/false).
Rules:
- kick[0]=true
- snare[4] and snare[${n===16?12:Math.floor(n/2)+4}]=true
- bass808 follows kick
- hi-hats dense, hi-hat_o occasional, clap/perc optional
Return only JSON, no explanations, no markdown.`
          }
        ],
        temperature: 0.9,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/); // Extrae cualquier JSON dentro del texto
    let pattern;

    if (!match) {
      console.log("⚠️ No JSON found, using fallback");
      pattern = fallbackPattern();
    } else {
      try {
        pattern = JSON.parse(match[0]);
      } catch (err) {
        console.log("⚠️ JSON parse failed, using fallback");
        pattern = fallbackPattern();
      }
    }

    // Aseguramos longitud correcta
    Object.keys(pattern).forEach(key => {
      if (!Array.isArray(pattern[key])) pattern[key] = Array(n).fill(false);
      while (pattern[key].length<n) pattern[key].push(false);
      pattern[key] = pattern[key].slice(0,n);
    });

    res.status(200).json({ pattern });

  } catch(err) {
    console.log("⚠️ Fetch error, using fallback", err.message);
    res.status(200).json({ pattern: fallbackPattern() });
  }
}

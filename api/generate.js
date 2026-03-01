export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, bpm, steps } = req.body;
  const n = parseInt(steps) || 16;

  function createFallbackPattern() {
    const empty = () => Array(n).fill(false);

    const pattern = {
      kick: empty(),
      snare: empty(),
      hihat_c: empty(),
      hihat_o: empty(),
      clap: empty(),
      perc1: empty(),
      perc2: empty(),
      bass808: empty(),
      lead: empty(),
      pad: empty(),
      arp: empty()
    };

    // Kick básico
    pattern.kick[0] = true;
    if (n > 8) pattern.kick[8] = true;

    // Snare clásica
    if (n > 4) pattern.snare[4] = true;
    if (n > 12) pattern.snare[12] = true;

    // Hi-hat constante
    for (let i = 0; i < n; i += 2) {
      pattern.hihat_c[i] = true;
    }

    // 808 sigue kick
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
            role: 'user',
            content: `Return ONLY valid JSON. Generate a trap beat pattern with ${n} boolean steps per array.
Keys: kick, snare, hihat_c, hihat_o, clap, perc1, perc2, bass808, lead, pad, arp.
Kick[0]=true. Snare[4] and Snare[12]=true.`
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.log("No JSON returned, using fallback");
      return res.status(200).json({ pattern: createFallbackPattern() });
    }

    let pattern;

    try {
      pattern = JSON.parse(match[0]);
    } catch (err) {
      console.log("JSON parse failed, using fallback");
      return res.status(200).json({ pattern: createFallbackPattern() });
    }

    Object.keys(pattern).forEach(key => {
      if (!Array.isArray(pattern[key])) {
        pattern[key] = Array(n).fill(false);
      }
      while (pattern[key].length < n) pattern[key].push(false);
      pattern[key] = pattern[key].slice(0, n);
    });

    res.status(200).json({ pattern });

  } catch (err) {
    console.error("Groq error:", err.message);
    res.status(200).json({ pattern: createFallbackPattern() });
  }
}

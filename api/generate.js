export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, bpm, steps } = req.body;
  const n = parseInt(steps) || 16;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `You are an expert trap producer.
Return ONLY raw JSON.
Each key must have exactly ${n} boolean values.
Keys: kick, snare, hihat_c, hihat_o, clap, perc1, perc2, bass808, lead, pad, arp.`
          },
          {
            role: 'user',
            content: `Style: ${prompt}. BPM: ${bpm}.
Rules:
- Kick 0 = true
- Snare 4 and 12 = true
- 808 follows kick but with variation
- Hi-hats dynamic and energetic`
          }
        ],
        max_tokens: 1200
      })
    });

    const data = await response.json();
    const pattern = JSON.parse(data.choices[0].message.content);

    Object.keys(pattern).forEach(key => {
      while (pattern[key].length < n) pattern[key].push(false);
      pattern[key] = pattern[key].slice(0, n);
    });

    res.status(200).json({ pattern });

  } catch (err) {
    console.error("REAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

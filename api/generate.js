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
          { role: 'user', content: `Return ONLY JSON. Generate trap beat with ${n} steps.` }
        ],
        temperature: 0.8,
        max_tokens: 800
      })
    });

    const data = await response.json();

    // Protección: si no hay choices, usamos fallback
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.log("⚠️ Groq response invalid, using fallback", JSON.stringify(data));
      return res.status(200).json({ pattern: fallbackPattern() });
    }

    const text = data.choices[0].message.content;

    let pattern;
    try {
      pattern = JSON.parse(text);
    } catch(e) {
      console.log("⚠️ JSON parse failed, using fallback", text.substring(0,200));
      pattern = fallbackPattern();
    }

    Object.keys(pattern).forEach(key => {
      while(pattern[key].length<n) pattern[key].push(false);
      pattern[key] = pattern[key].slice(0,n);
    });

    res.status(200).json({ pattern });

  } catch(err) {
    console.log("⚠️ Fetch failed, using fallback", err.message);
    res.status(200).json({ pattern: fallbackPattern() });
  }
}

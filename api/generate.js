export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, bpm, steps, vibeParams } = req.body;
  const n = parseInt(steps) || 16;

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
            content: `Generate a trap beat pattern as JSON. Style: ${prompt || 'dark trap heavy 808'}. BPM: ${bpm}. 
Return ONLY a raw JSON object with no explanation, no markdown, no code blocks.
Each key must have exactly ${n} boolean values.
Rules: kick[0]=true always, snare[4]=true and snare[${n===16?12:n/2+4}]=true always, bass808 follows kick pattern.
Keys: kick, snare, hihat_c, hihat_o, clap, perc1, perc2, bass808, lead, pad, arp.
Example format: {"kick":[true,false,false,false,false,false,false,false,true,false,true,false,false,false,false,false],"snare":[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],...}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    console.log('Groq response:', JSON.stringify(data));
    
    const text = data.choices?.[0]?.message?.content || '';
    console.log('Text:', text);
    
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON: ' + text.substring(0, 200));
    
    const pattern = JSON.parse(match[0]);

    Object.keys(pattern).forEach(key => {
      if (Array.isArray(pattern[key])) {
        while (pattern[key].length < n) pattern[key].push(false);
        pattern[key] = pattern[key].slice(0, n);
      }
    });

    res.status(200).json({ pattern });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

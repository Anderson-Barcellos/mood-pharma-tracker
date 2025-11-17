const {
  GEMINI_API_KEY,
  GEMINI_MODEL = 'gemini-2.5-flash',
  GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
} = process.env;

if (!GEMINI_API_KEY) {
  console.error('Set GEMINI_API_KEY before running this script.');
  process.exit(1);
}

const prompt = `Quick sanity check. Reply with a tiny JSON object: {"status":"ok"}.`;

async function main() {
  const endpoint = `${GEMINI_API_URL.replace(/\/$/, '')}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: 'application/json'
      }
    })
  });

  console.log('HTTP status:', res.status);
  const text = await res.text();
  console.log('Raw response:', text);
}

main().catch((err) => {
  console.error('Ping failed:', err);
  process.exit(1);
});

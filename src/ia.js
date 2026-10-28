export async function clasificarProblema(texto) {
  const apiKey = import.meta.env.VITE_OPENAI_KEY;
  
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: `Eres un asistente técnico. Analiza el problema del usuario y devuelve SOLO un JSON válido con esta estructura exacta: { "equipo": "laptop" | "celular" | "redes" | "otro", "falla": "resumen corto de la falla", "urgencia": "alta" | "media" | "baja" } No agregues texto extra, solo el JSON.` },
        { role: "user", content: texto }
      ],
      response_format: { type: "json_object" }
    })
  });
  
  if (!response.ok) throw new Error("Error al conectar con la IA");
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// NUEVA FUNCIÓN DE TELEGRAM
export async function enviarMensajeTelegram(textoMensaje) {
  const token = import.meta.env.VITE_TELEGRAM_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: textoMensaje
    })
  });

  if (!response.ok) {
    throw new Error("Error al enviar mensaje por Telegram");
  }
  return await response.json();
}
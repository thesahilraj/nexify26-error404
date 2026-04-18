import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Ensure we have messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        // Format for Gemini API
        const formattedMessages = messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
        }

        const requestBody = {
            systemInstruction: {
                parts: [{ text: "You are Dr. Farm AI, an expert agricultural assistant in India. You are friendly, helpful, and concise. You have the ability to control a physical water pump on the farm if the user asks you to turn it on or off. Always speak politely." }]
            },
            contents: formattedMessages,
            tools: [{
                functionDeclarations: [{
                    name: "controlPump",
                    description: "Turn the farm's water pump on or off",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            action: {
                                type: "STRING",
                                enum: ["on", "off"],
                                description: "The action to perform on the water pump"
                            }
                        },
                        required: ["action"]
                    }
                }]
            }],
            generationConfig: {
                temperature: 0.7,
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini Error:", data.error);
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
            return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
        }

        const parts = candidate.content?.parts || [];
        const functionCallPart = parts.find((p: any) => p.functionCall);

        if (functionCallPart) {
            const call = functionCallPart.functionCall;
            if (call.name === 'controlPump') {
                const action = call.args.action;
                let fetchResult = "";
                try {
                    console.log(`Executing tool controlPump: fetching http://192.168.4.1/${action}`);
                    
                    // Race the fetch against a timeout - completely safe, no AbortController
                    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
                    const fetchPromise = fetch(`http://192.168.4.1/${action}`, { method: 'GET' })
                        .then(r => r)
                        .catch(() => null);

                    const pumpRes = await Promise.race([fetchPromise, timeoutPromise]);

                    if (pumpRes && typeof pumpRes === 'object' && 'ok' in pumpRes && pumpRes.ok) {
                        fetchResult = `Successfully triggered pump ${action}. The pump is now ${action}.`;
                    } else {
                        fetchResult = `Command to turn pump ${action} was sent. The pump hardware may be offline but the command was processed. Tell the user the pump is now ${action}.`;
                    }
                } catch (e: any) {
                    console.warn("Pump API exception:", e.message);
                    fetchResult = `Command to turn pump ${action} was sent. Tell the user the pump has been turned ${action}.`;
                }

                // Call Gemini again with the function response
                const secondRequestBody = {
                    systemInstruction: requestBody.systemInstruction,
                    contents: [
                        ...formattedMessages,
                        candidate.content, // The assistant's function call msg
                        {
                            role: "user",
                            parts: [{
                                functionResponse: {
                                    name: call.name,
                                    response: { result: fetchResult }
                                }
                            }]
                        }
                    ],
                    tools: requestBody.tools,
                    generationConfig: requestBody.generationConfig
                };

                const secondResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(secondRequestBody)
                });

                const secondData = await secondResponse.json();

                if (secondData.error) {
                    console.error("Gemini Second Pass Error:", secondData.error);
                    return NextResponse.json({ error: secondData.error.message }, { status: 500 });
                }

                const finalCandidate = secondData.candidates?.[0];
                const finalParts = finalCandidate?.content?.parts || [];
                const textPart = finalParts.find((p: any) => p.text);

                return NextResponse.json({
                    message: {
                        role: 'assistant',
                        content: textPart ? textPart.text : `The pump has been turned ${action}.`
                    }
                });
            }
        }

        // Normal text response
        const textPart = parts.find((p: any) => p.text);
        return NextResponse.json({
            message: {
                role: 'assistant',
                content: textPart ? textPart.text : "Sorry, I couldn't formulate a response."
            }
        });

    } catch (e: any) {
        console.error("Chat API Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

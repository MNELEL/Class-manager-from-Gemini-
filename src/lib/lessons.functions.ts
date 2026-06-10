import { generateEmbedding } from "./embeddings.server";
import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase-admin";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

/**
 * Transcribes audio and generates pedagogical summary and key points
 */
export async function transcribeAndSummarize(audioBuffer: Buffer, classId: string, userId: string) {
  const formData = new FormData();
  formData.append('audio', new Blob([audioBuffer], { type: 'audio/mp3' }));
  formData.append('classId', classId);
  formData.append('userId', userId);
  
  const response = await fetch('/api/audio/transcribe', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('Failed to transcribe audio');
  
  const data = await response.json();
  return data.lessonId;
}

/**
 * Generates a resource based on transcript content
 */
export async function generateResourceFromTranscript(transcriptId: string, resourceType: 'worksheet' | 'quiz', styleProfile: any) {
    const transcriptSnap = await db.collection("lesson_transcripts").doc(transcriptId).get();
    if (!transcriptSnap.exists) throw new Error("Transcript not found");
    
    const transcriptData = transcriptSnap.data();
    
    // Call Gemini with style context
    const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{
            role: "user",
            parts: [{
                text: `Create a ${resourceType} based on this lesson content: ${transcriptData?.transcript}. 
                       Style guidance: ${JSON.stringify(styleProfile)}.
                       Ensure it tests deep understanding of content mentioned in the transcript.`
            }]
        }]
    });

    const resourceContent = result.text || "";
    
    // Store resource
    const resourceRef = await db.collection("teaching_resources").add({
        title: `Resource from lesson`,
        content: resourceContent,
        type: resourceType,
        sourceTranscriptId: transcriptId,
        createdAt: new Date().toISOString()
    });

    return resourceRef.id;
}

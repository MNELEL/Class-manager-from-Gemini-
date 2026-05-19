export async function generateContent(prompt: string, systemInstruction?: string, model?: string): Promise<string> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, systemInstruction, model }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'AI generation failed');
  }

  const data = await response.json();
  return data.text;
}

export async function generateLessonPlan(topic: string, gradeLevel: string, duration: string, objectives?: string): Promise<string> {
  const response = await fetch('/api/ai/lesson-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, gradeLevel, duration, objectives }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Lesson plan generation failed');
  }

  const data = await response.json();
  return data.text;
}

import { OpenAI } from 'openai';
import fs from 'fs';
import { config } from '../../config/env';

export type TranscriptionProvider = 'openai' | 'google' | 'assemblyai' | 'elevenlabs';

export type TranscriptionResult = {
    text: string;
    provider: TranscriptionProvider;
    duration?: number;
    confidence?: number;
    studyMaterials?: StudyMaterials;
};

export type StudyMaterials = {
    summary: string;
    keyPoints: string[];
    topics: string[];
    categories: string[];
    searchableKeywords: string[];
    studyGuide: {
        mainConcepts: string[];
        importantTerms: { term: string; definition: string; }[];
        questions: string[];
        takeaways: string[];
    };
    timestamps?: { time: number; content: string; topic: string; }[];
};

const openai = new OpenAI({
    apiKey: config.openai,
});

export async function transcribeAudio(filePath: string, provider: TranscriptionProvider = 'openai'): Promise<TranscriptionResult> {
    let result: TranscriptionResult;

    switch (provider) {
        case 'openai':
            result = await transcribeWithOpenAI(filePath);
            break;
        case 'google':
            result = await transcribeWithGoogle(filePath);
            break;
        case 'assemblyai':
            result = await transcribeWithAssemblyAI(filePath);
            break;
        case 'elevenlabs':
            result = await transcribeWithElevenLabs(filePath);
            break;
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }

    if (result.text && result.text.length > 50) {
        result.studyMaterials = await generateStudyMaterials(result.text);
    }

    return result;
}

async function transcribeWithOpenAI(filePath: string): Promise<TranscriptionResult> {
    try {
        const audioFile = fs.createReadStream(filePath);

        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        return {
            text: transcription.text,
            provider: 'openai',
        };
    } catch (error: any) {
        console.error('OpenAI transcription error:', error);
        throw new Error(`OpenAI transcription failed: ${error.message}`);
    }
}

async function transcribeWithGoogle(filePath: string): Promise<TranscriptionResult> {
    try {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !config.google_creds) {
            throw new Error('Google Cloud credentials not configured');
        }

        let speech: any;
        try {
            speech = await eval(`import('@google-cloud/speech')`);
        } catch (importError) {
            throw new Error('Google Cloud Speech SDK not installed. Run: npm install @google-cloud/speech');
        }

        const client = new speech.SpeechClient();

        const audioBytes = fs.readFileSync(filePath);

        const audioConfig = {
            encoding: 'WEBM_OPUS' as any,
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
        };

        const request = {
            audio: { content: audioBytes },
            config: audioConfig,
        };

        const [response] = await client.recognize(request);

        if (!response.results || response.results.length === 0) {
            throw new Error('No transcription results from Google Speech');
        }

        const transcription = response.results
            .map(result => result.alternatives?.[0]?.transcript || '')
            .join(' ');

        const confidence = response.results[0]?.alternatives?.[0]?.confidence || 0;

        return {
            text: transcription,
            provider: 'google',
            confidence,
        };
    } catch (error: any) {
        console.error('Google Speech transcription error:', error);
        throw new Error(`Google Speech transcription failed: ${error.message}`);
    }
}

async function transcribeWithAssemblyAI(filePath: string): Promise<TranscriptionResult> {
    try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY;
        if (!apiKey) {
            throw new Error('AssemblyAI API key not configured');
        }

        const audioData = fs.readFileSync(filePath);

        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/octet-stream',
            },
            body: audioData,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const { upload_url } = await uploadResponse.json();

        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: upload_url,
                punctuate: true,
                format_text: true,
            }),
        });

        if (!transcriptResponse.ok) {
            throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
        }

        const { id } = await transcriptResponse.json();

        let status = 'queued';
        let result: any;

        while (status !== 'completed' && status !== 'error') {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });

            if (!pollResponse.ok) {
                throw new Error(`Polling failed: ${pollResponse.statusText}`);
            }

            result = await pollResponse.json();
            status = result.status;
        }

        if (status === 'error') {
            throw new Error(`AssemblyAI transcription failed: ${result.error}`);
        }

        return {
            text: result.text || '',
            provider: 'assemblyai',
            confidence: result.confidence,
        };
    } catch (error: any) {
        console.error('AssemblyAI transcription error:', error);
        throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
}

async function transcribeWithElevenLabs(filePath: string): Promise<TranscriptionResult> {
    try {
        const apiKey = config.eleven_api_key;
        if (!apiKey) {
            throw new Error('ElevenLabs API key not configured');
        }

        const audioData = fs.readFileSync(filePath);
        const formData = new FormData();
        formData.append('audio', new Blob([audioData]), 'audio.webm');

        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.statusText}`);
        }

        const result = await response.json();

        return {
            text: result.text || '',
            provider: 'elevenlabs',
        };
    } catch (error: any) {
        console.error('ElevenLabs transcription error:', error);
        throw new Error(`ElevenLabs transcription failed: ${error.message}`);
    }
}

async function generateStudyMaterials(transcriptionText: string): Promise<StudyMaterials> {
    try {
        const prompt = `Analyze this transcription and create organized study materials:

TRANSCRIPTION:
${transcriptionText}

Please provide a JSON response with the following structure:
{
    "summary": "Brief overview of the main content (2-3 sentences)",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "topics": ["Topic 1", "Topic 2", "Topic 3"],
    "categories": ["Category like 'Science', 'History', 'Math', etc."],
    "searchableKeywords": ["keyword1", "keyword2", "keyword3"],
    "studyGuide": {
        "mainConcepts": ["Concept 1", "Concept 2"],
        "importantTerms": [{"term": "Term", "definition": "Definition"}],
        "questions": ["Question 1?", "Question 2?"],
        "takeaways": ["Key takeaway 1", "Key takeaway 2"]
    }
}

Make it educational and useful for studying. Focus on extracting the most important information for learning purposes.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert educational content analyzer. Create comprehensive study materials from transcriptions. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });

        const responseText = completion.choices[0]?.message?.content?.trim();
        if (!responseText) {
            throw new Error('No response from AI');
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid JSON response from AI');
        }

        const studyMaterials = JSON.parse(jsonMatch[0]);

        return {
            summary: studyMaterials.summary || 'Content analysis not available',
            keyPoints: studyMaterials.keyPoints || [],
            topics: studyMaterials.topics || [],
            categories: studyMaterials.categories || ['General'],
            searchableKeywords: studyMaterials.searchableKeywords || [],
            studyGuide: {
                mainConcepts: studyMaterials.studyGuide?.mainConcepts || [],
                importantTerms: studyMaterials.studyGuide?.importantTerms || [],
                questions: studyMaterials.studyGuide?.questions || [],
                takeaways: studyMaterials.studyGuide?.takeaways || []
            }
        };
    } catch (error: any) {
        console.error('Study materials generation error:', error);

        return {
            summary: 'Unable to generate summary',
            keyPoints: [],
            topics: [],
            categories: ['General'],
            searchableKeywords: [],
            studyGuide: {
                mainConcepts: [],
                importantTerms: [],
                questions: [],
                takeaways: []
            }
        };
    }
}
import { transcribeAudio, TranscriptionProvider } from "../../services/transcriber";
import { config } from "../../config/env";
import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';

type ParsedTranscriptionRequest = {
    provider: TranscriptionProvider;
    files: Array<{ path: string; filename: string; mimeType: string }>;
};

function parseTranscriptionRequest(req: any): Promise<ParsedTranscriptionRequest> {
    return new Promise((resolve, reject) => {
        const bb = Busboy({ headers: req.headers });
        let provider: TranscriptionProvider = config.transcription_provider as TranscriptionProvider;
        const files: Array<{ path: string; filename: string; mimeType: string }> = [];
        let pending = 0;
        let ended = false;
        let failed = false;
        const done = () => {
            if (!failed && ended && pending === 0) {
                resolve({ provider, files });
            }
        };

        const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        bb.on('field', (name, value) => {
            if (name === 'provider') {
                provider = value as TranscriptionProvider;
            }
        });

        bb.on('file', (_name, file, info: any) => {
            pending++;
            const filename = info?.filename || 'audio';
            const mimeType = info?.mimeType || info?.mime || 'audio/webm';
            const filePath = path.join(uploadDir, `${Date.now()}-${filename}`);
            const writeStream = fs.createWriteStream(filePath);

            file.on('error', (e) => {
                failed = true;
                reject(e);
            });
            writeStream.on('error', (e) => {
                failed = true;
                reject(e);
            });
            writeStream.on('finish', () => {
                files.push({ path: filePath, filename, mimeType });
                pending--;
                done();
            });

            file.pipe(writeStream);
        });

        bb.on('error', (e) => {
            failed = true;
            reject(e);
        });
        bb.on('finish', () => {
            ended = true;
            done();
        });

        req.pipe(bb);
    });
}

export function transcriberRoutes(app: any) {
    app.post("/transcriber", async (req: any, res: any) => {
        try {
            const contentType = req.headers['content-type'] || '';

            if (!contentType.includes('multipart/form-data')) {
                return res.status(400).json({
                    ok: false,
                    error: 'Content-Type must be multipart/form-data'
                });
            }

            const { provider, files } = await parseTranscriptionRequest(req);

            if (!files || files.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: 'No audio file provided'
                });
            }

            const audioFile = files[0];

            // Check if it's an audio file (or video, which often contains audio)
            if (!audioFile.mimeType.startsWith('audio/') && !audioFile.mimeType.startsWith('video/')) {
                return res.status(400).json({
                    ok: false,
                    error: 'File must be an audio or video file'
                });
            }

            console.log(`[transcriber] Processing ${audioFile.filename} with ${provider} provider`);

            const result = await transcribeAudio(audioFile.path, provider);

            // Clean up the temporary file
            try {
                fs.unlinkSync(audioFile.path);
            } catch (e) {
                console.warn('Failed to delete temp file:', audioFile.path);
            }

            res.json({
                ok: true,
                transcription: result.text,
                provider: result.provider,
                duration: result.duration,
                confidence: result.confidence
            });

        } catch (error: any) {
            console.error('Transcription route error:', error);
            res.status(500).json({
                ok: false,
                error: error.message || 'Transcription failed'
            });
        }
    });
}
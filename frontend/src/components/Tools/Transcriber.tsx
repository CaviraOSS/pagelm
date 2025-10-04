import { useState, useRef, useEffect } from "react";
import { transcribeAudio, type StudyMaterials } from "../../lib/api";

export default function Transcriber() {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showSiriUI, setShowSiriUI] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [status, setStatus] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [processing, setProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setBusy(true);
    setProcessing(true);
    setStatus("Transcribing audio...");
    setTranscription(null);
    setStudyMaterials(null);
    setConfidence(null);

    try {
      const result = await transcribeAudio(file);
      
      if (result.ok && result.transcription) {
        setTranscription(result.transcription);
        setStudyMaterials(result.studyMaterials || null);
        setConfidence(result.confidence || null);
        setStatus("Study materials ready!");
      } else {
        setStatus(`Error: ${result.error || 'Transcription failed'}`);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message || 'Failed to transcribe audio'}`);
    } finally {
      setBusy(false);
      setProcessing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const startRecording = async () => {
    try {
      setShowSiriUI(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(Math.min(1, average / 128));
        
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };
      
      monitorAudioLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        stream.getTracks().forEach(track => track.stop());
        
        await handleFileUpload(audioFile);
        setShowSiriUI(false);
      };

      mediaRecorder.start();
      setRecording(true);
      setStatus("Listening...");
    } catch (error) {
      setStatus("Error: Could not access microphone");
      setShowSiriUI(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setAudioLevel(0);
      setProcessing(true);
      setStatus("Processing...");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setAudioLevel(0);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setShowSiriUI(false);
    setStatus("Recording cancelled");
  };

  const copyToClipboard = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription);
      setStatus("Copied to clipboard!");
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const time = performance.now() * 0.001;
  const orbSize = window.innerWidth < 768 ? Math.min(window.innerWidth * 0.8, 500) : Math.min(window.innerWidth * 0.6, 600);
  const audioIntensity = Math.max(0.08, audioLevel);
  const idleWave = Math.sin(time * 0.6) * 0.4 + Math.cos(time * 0.9) * 0.3;
  
  if (showSiriUI) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blur-3xl flex items-center justify-center bg-black/70">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-600/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-purple-600/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-b from-pink-500/10 to-transparent rounded-full blur-2xl"></div>
        
        <div className="relative w-full h-full flex flex-col items-center justify-center px-6">
          <div className="relative" style={{ width: orbSize, height: orbSize }}>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover rounded-full"
              style={{
                transform: `scale(${1 + audioIntensity * 0.1 + idleWave * 0.03})`,
                filter: `blur(${processing ? '1px' : '0px'}) brightness(${0.8 + audioIntensity * 0.3})`,
                opacity: 0.9 + audioIntensity * 0.1
              }}
            >
              <source src="/voice/orb.mp4" type="video/mp4" />
            </video>
          </div>

          <div className="absolute bottom-16 sm:bottom-20 flex items-center gap-6 sm:gap-8">
            <button
              onClick={cancelRecording}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/10 text-white/60 hover:text-white/90 hover:border-white/20 transition-all duration-300 flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={recording ? stopRecording : undefined}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/25 transition-all duration-300 flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            </button>
          </div>

          {processing && (
            <div className="absolute bottom-4 sm:bottom-6 text-center">
              <div className="text-white/90 text-base sm:text-lg font-light tracking-wide">Processing</div>
              <div className="text-white/60 text-xs sm:text-sm mt-1">Converting speech to text</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-2xl bg-stone-950 border border-zinc-800 p-4 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs uppercase tracking-wide text-orange-400 font-semibold">voice transcriber</div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse"></div>
          </div>
          <div className="text-white font-semibold text-xl mb-2">Audio to Text</div>
          <div className="text-stone-300 text-sm leading-relaxed">
            Convert lecture recordings and voice notes into organized, searchable study materials instantly.
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={startRecording}
            disabled={busy}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all duration-300 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 616 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Record Voice
              </>
            )}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={onFileChange}
            disabled={busy}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="px-6 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-stone-300 hover:text-white font-medium transition-all duration-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded-xl font-medium ${
            status.startsWith('Error') 
              ? 'bg-red-950/40 border border-red-800/40 text-red-200'
              : 'bg-orange-950/40 border border-orange-800/40 text-orange-200'
          }`}>
            {status}
            {confidence && (
              <span className="block text-sm mt-1 opacity-75">
                Confidence: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        )}

        {transcription && (
          <div className="space-y-4">
            {studyMaterials && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-950/40 to-red-950/40 border border-orange-800/40">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3 className="text-orange-400 font-semibold">Study Materials Generated</h3>
                  </div>
                  <p className="text-orange-200 text-sm">{studyMaterials.summary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-stone-900/50 border border-zinc-700">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                      </svg>
                      Key Points
                    </h4>
                    <ul className="space-y-2">
                      {studyMaterials.keyPoints.map((point, i) => (
                        <li key={i} className="text-stone-300 text-sm flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-900/50 border border-zinc-700">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                      </svg>
                      Topics & Categories
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Topics</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {studyMaterials.topics.map((topic, i) => (
                            <span key={i} className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded-md">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Categories</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {studyMaterials.categories.map((cat, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded-md">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {studyMaterials.studyGuide.mainConcepts.length > 0 && (
                  <div className="p-4 rounded-xl bg-stone-900/50 border border-zinc-700">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Study Guide
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h5 className="text-stone-300 font-medium mb-2">Main Concepts</h5>
                        <ul className="space-y-1">
                          {studyMaterials.studyGuide.mainConcepts.map((concept, i) => (
                            <li key={i} className="text-stone-400 text-sm">• {concept}</li>
                          ))}
                        </ul>
                      </div>
                      {studyMaterials.studyGuide.questions.length > 0 && (
                        <div>
                          <h5 className="text-stone-300 font-medium mb-2">Study Questions</h5>
                          <ul className="space-y-1">
                            {studyMaterials.studyGuide.questions.map((question, i) => (
                              <li key={i} className="text-stone-400 text-sm">• {question}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 rounded-xl bg-stone-900/50 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-stone-300">Original Transcription</label>
                <button
                  onClick={copyToClipboard}
                  className="text-xs px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="text-white text-sm leading-relaxed max-h-48 overflow-y-auto bg-stone-800/30 p-3 rounded-lg">
                {transcription}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
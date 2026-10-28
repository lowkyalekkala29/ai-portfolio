"use client";

import { useEffect, useRef, useState } from "react";

/** Free, in-browser teleprompter + recorder (MediaRecorder). Nothing is uploaded. */
export default function Recorder({ text }: { text: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [url, setUrl] = useState("");
  const [ext, setExt] = useState("webm");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      if (scrollRef.current) scrollRef.current.scrollTop += speed / 20;
    }, 50);
    return () => clearInterval(t);
  }, [recording, speed]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can't record. Try recent Chrome, Edge or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      const mime = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const type = rec.mimeType || "video/webm";
        setExt(type.includes("mp4") ? "mp4" : "webm");
        setUrl(URL.createObjectURL(new Blob(chunks.current, { type })));
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      };
      rec.start();
      recorderRef.current = rec;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      if (url) URL.revokeObjectURL(url);
      setUrl("");
      setRecording(true);
    } catch {
      setError("Camera or microphone access was denied or unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <video ref={videoRef} playsInline className="aspect-video w-full rounded-lg bg-zinc-900" />
        <div ref={scrollRef} className="h-56 overflow-y-auto rounded-lg bg-zinc-900 p-4 text-xl leading-relaxed text-white md:h-auto" aria-label="Teleprompter">
          <p className="whitespace-pre-wrap">{text}</p>
          <div className="h-40" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button onClick={start} className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Start recording</button>
        ) : (
          <button onClick={stop} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">Stop</button>
        )}
        <label className="flex items-center gap-2 text-sm">
          Scroll speed
          <input type="range" min={10} max={80} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
        </label>
        {url && (
          <a href={url} download={`my-walkthrough.${ext}`} className="rounded-md border border-zinc-400 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Download recording
          </a>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {url && <video src={url} controls className="w-full rounded-lg" />}
    </div>
  );
}

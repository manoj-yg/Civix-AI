import React, { useState } from 'react';
import { Film, Upload, Sliders, Play, Download, RefreshCw, CheckCircle2, Maximize2 } from 'lucide-react';
import axios from 'axios';

export default function VideoDetectView() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [confidence, setConfidence] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleProcessVideo = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence', confidence);

      const res = await axios.post('/api/detect/video', formData);
      setResult(res.data);
    } catch (err) {
      alert('Video processing failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
            Video Footage Inspection
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Frame-by-frame neural inspection of high-definition dashcam recordings and aerial drone clips
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-semibold text-sm text-slate-200">Select Video Clip</h3>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl cursor-pointer bg-dark-800/50 hover:bg-dark-800 transition group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <div className="p-3.5 rounded-full bg-purple-500/10 text-purple-400 mb-2 group-hover:scale-110 transition">
                  <Film className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Choose or Drag Video'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Dashcam clips, MP4, MOV footage</p>
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Sliders className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Confidence Threshold</h3>
              </div>
              <span className="text-xs font-bold text-white font-mono">{Math.round(confidence * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />

            <button
              disabled={!selectedFile || loading}
              onClick={handleProcessVideo}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Video Frames...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Process Video File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Widescreen Video Player Viewport */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-semibold text-base text-slate-200">Expanded Video Inspection Player</h3>

          <div className="w-full h-[400px] md:h-[540px] bg-black rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center relative">
            {result?.video_url ? (
              <video src={result.video_url} controls className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Film className="w-12 h-12 text-slate-600" />
                <span className="text-xs text-slate-400">
                  {loading ? 'Performing frame-by-frame YOLO inference...' : 'Upload video file and click Process to watch playback with bounding box annotations'}
                </span>
              </div>
            )}
          </div>

          {result && (
            <div className="p-4 rounded-xl bg-dark-800/80 border border-slate-700/60 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400">Frame Progress: </span>
                <span className="font-mono text-white font-bold">{result.processed_frames} / {result.total_frames} frames</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.damage_types?.map((dt, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                      {dt}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href={result.video_url}
                download
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-500/25"
              >
                <Download className="w-4 h-4" />
                Download Annotated Video
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

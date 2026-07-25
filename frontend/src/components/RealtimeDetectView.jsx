import React, { useState, useEffect, useRef } from 'react';
import { Camera, VideoOff, Sliders, MapPin, AlertCircle, ShieldCheck, Play, Square, Navigation } from 'lucide-react';
import axios from 'axios';

export default function RealtimeDetectView() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [confidence, setConfidence] = useState(0.5);
  const [detections, setDetections] = useState([]);
  const [locationInfo, setLocationInfo] = useState({ 
    lat: null, 
    lon: null, 
    accuracy: null,
    altitude: null,
    speed: null,
    desc: 'Acquiring high-accuracy HTML5 GPS...' 
  });
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [savedMessage, setSavedMessage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamIntervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // High-accuracy continuous HTML5 geolocation tracking
  useEffect(() => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setLocationInfo({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
            speed: pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : null,
            desc: `Device High-Accuracy GPS (±${Math.round(pos.coords.accuracy)}m)`
          });
        },
        (err) => {
          setLocationInfo((prev) => ({ ...prev, desc: 'Device GPS unavailable (IP location fallback)' }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsStatus('Connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.detections) {
          setDetections(data.detections);
          drawOverlay(data.detections);
        }
      };

      ws.onclose = () => {
        setWsStatus('Disconnected');
      };

      wsRef.current = ws;

      // Frame sender loop (~10 FPS)
      streamIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          ws.send(JSON.stringify({ image: dataUrl, confidence }));
        }
      }, 100);

    } catch (err) {
      alert('Unable to access camera: ' + err.message);
    }
  };

  const stopStream = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setWsStatus('Disconnected');
    setDetections([]);

    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  };

  const drawOverlay = (dets) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (video.videoWidth || 1);
    const scaleY = canvas.height / (video.videoHeight || 1);

    dets.forEach((det) => {
      const [x1, y1, x2, y2] = det.box;
      const boxX = x1 * scaleX;
      const boxY = y1 * scaleY;
      const boxW = (x2 - x1) * scaleX;
      const boxH = (y2 - y1) * scaleY;

      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#F43F5E';
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 12px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(boxX, boxY - 22 > 0 ? boxY - 22 : boxY, textWidth + 12, 22);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, boxX + 6, boxY - 22 > 0 ? boxY - 6 : boxY + 15);
    });
  };

  const logCurrentIncident = async () => {
    if (detections.length === 0) {
      alert('No road damage currently detected to log.');
      return;
    }

    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'realtime_snap.jpg');
      formData.append('confidence', confidence);
      if (locationInfo.lat) formData.append('lat', locationInfo.lat);
      if (locationInfo.lon) formData.append('lon', locationInfo.lon);
      formData.append('loc_desc_custom', locationInfo.desc);
      formData.append('save_incident', 'true');

      try {
        const res = await axios.post('/api/detect/image', formData);
        setSavedMessage(`Incident ${res.data.saved_incident?.id || 'logged'} successfully!`);
        setTimeout(() => setSavedMessage(null), 4000);
      } catch (err) {
        alert('Failed to save incident: ' + err.message);
      }
    }, 'image/jpeg');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">
            Realtime Stream Inspection
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Low-latency high-resolution webcam inspection with continuous HTML5 GPS geolocational tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
            wsStatus === 'Connected' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsStatus === 'Connected' ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
            Stream: {wsStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Stream Canvas Viewport */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col space-y-4">
          <div className="relative w-full h-[400px] md:h-[560px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            <video 
              ref={videoRef} 
              playsInline 
              muted 
              className={`w-full h-full object-contain ${isStreaming ? 'block' : 'hidden'}`} 
            />
            <canvas ref={canvasRef} className="hidden" />
            <canvas 
              ref={overlayCanvasRef} 
              className={`absolute top-0 left-0 w-full h-full pointer-events-none ${isStreaming ? 'block' : 'hidden'}`} 
            />

            {!isStreaming && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-blue-400">
                  <Camera className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Camera Stream Standby</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click the button below to enable camera feed for real-time road defect detection
                </p>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {!isStreaming ? (
              <button
                onClick={startStream}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/25"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Camera Stream
              </button>
            ) : (
              <button
                onClick={stopStream}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-500/25"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop Stream
              </button>
            )}

            {isStreaming && (
              <button
                onClick={logCurrentIncident}
                disabled={detections.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-40 shadow-lg shadow-emerald-500/25"
              >
                <ShieldCheck className="w-4 h-4" />
                Log Incident ({detections.length})
              </button>
            )}
          </div>

          {savedMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {savedMessage}
            </div>
          )}
        </div>

        {/* Sidebar Info & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Precise Location Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Navigation className="w-4 h-4 animate-pulse" />
              <h3 className="font-semibold text-sm">High-Accuracy Geolocation</h3>
            </div>
            <div className="text-xs text-slate-300 font-mono bg-dark-800 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
              <div><strong>Latitude:</strong> {locationInfo.lat ? locationInfo.lat.toFixed(6) : 'Acquiring...'}</div>
              <div><strong>Longitude:</strong> {locationInfo.lon ? locationInfo.lon.toFixed(6) : 'Acquiring...'}</div>
              {locationInfo.accuracy && (
                <div className="text-emerald-400 font-semibold">
                  <strong>Accuracy:</strong> ±{locationInfo.accuracy} meters
                </div>
              )}
              <div className="text-slate-400 text-[11px] font-sans pt-1 border-t border-slate-700/60">
                {locationInfo.desc}
              </div>
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
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
              className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Detections Feed */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-semibold text-sm text-slate-200">Real-Time Hazards ({detections.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {detections.length > 0 ? (
                detections.map((det, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-800 border border-slate-700/60 text-xs">
                    <span className="font-bold text-rose-400">{det.class_name}</span>
                    <span className="font-mono text-slate-300 font-semibold">{(det.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hazards detected in current stream view
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

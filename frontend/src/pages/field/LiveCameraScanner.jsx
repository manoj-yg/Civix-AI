import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, RefreshCw, MapPin, CheckCircle2, ShieldCheck, Play, Square, AlertOctagon, ChevronLeft, Map } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { SeverityBadge } from '../../components/common/Badge';
import apiClient from '../../api/axios';

export const LiveCameraScanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedDefects, setDetectedDefects] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [totalSavedCount, setTotalSavedCount] = useState(0);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946 });

  useEffect(() => {
    startCamera();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Location err:', err)
      );
    }
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  // Continuous frame analysis loop
  useEffect(() => {
    let timer;
    if (isScanning && cameraActive) {
      timer = setInterval(captureAndAnalyzeFrame, 700); // 700ms real-time loop
    }
    return () => clearInterval(timer);
  }, [isScanning, cameraActive]);

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get base64 frame string
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.6);

    try {
      const formData = new FormData();
      formData.append('frame_base64', frameBase64);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      formData.append('asset_type', 'road');

      const res = await apiClient.post('/detections/live-frame', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const dets = res.detections || res.data?.detections || [];
      setDetectedDefects(dets);

      // Draw bounding box overlays on live canvas
      drawOverlays(ctx, dets, canvas.width, canvas.height);

      if (res.saved_to_db && res.inspection_id) {
        setLastSavedId(res.inspection_id);
        setTotalSavedCount(prev => prev + 1);
      }
    } catch (err) {
      console.log('Live detection loop error:', err);
    }
  };

  const drawOverlays = (ctx, dets, width, height) => {
    ctx.clearRect(0, 0, width, height);

    dets.forEach(d => {
      const bbox = d.bbox;
      if (!bbox) return;

      const x1 = bbox.x1 || 0;
      const y1 = bbox.y1 || 0;
      const w = (bbox.x2 || width) - x1;
      const h = (bbox.y2 || height) - y1;

      // Glowing red/orange bounding box
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.strokeRect(x1, y1, w, h);

      // Fill semi-transparent overlay
      ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
      ctx.fillRect(x1, y1, w, h);

      // Bounding box label pill
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 14px sans-serif';
      const labelText = `${d.class_name || 'Pothole'} (${Math.round((d.confidence || 0.9) * 100)}%)`;
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillRect(x1, y1 > 25 ? y1 - 25 : y1, textWidth + 12, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, x1 + 6, y1 > 25 ? y1 - 8 : y1 + 16);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/field" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <span className="text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
          YOLOv8 Automated Scanner Active
        </span>
      </div>

      {/* Live Video Viewfinder Container */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] border border-slate-800 shadow-xl flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Real-Time Detection Bounding Box Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Camera Control Overlay Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
          <div className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
            <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span>{isScanning ? 'SCANNING VIDEO STREAM' : 'CAMERA READY'}</span>
          </div>

          <div className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10">
            Saved to DB: <span className="text-emerald-400 font-extrabold">{totalSavedCount}</span>
          </div>
        </div>

        {/* Live Detected Defect Toast Notification */}
        {lastSavedId && (
          <div className="absolute bottom-3 left-3 right-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-100 p-2.5 rounded-xl z-20 backdrop-blur-md flex items-center justify-between text-xs animate-bounce">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Automated Defect Saved to DB & Map!</span>
                <span className="text-[10px] text-emerald-300 font-mono">ID: {lastSavedId.slice(0, 8)}...</span>
              </div>
            </div>
            <Link to={`/field/inspections/${lastSavedId}`} className="text-[11px] font-bold text-white bg-emerald-600 px-2.5 py-1 rounded-md">
              View
            </Link>
          </div>
        )}
      </div>

      {/* Start / Stop Scanner Button Controls */}
      <div className="space-y-3">
        {isScanning ? (
          <Button
            fullWidth
            size="lg"
            variant="danger"
            onClick={() => setIsScanning(false)}
            icon={Square}
            className="py-3 shadow-md font-bold text-base"
          >
            Pause Real-Time Automated Scanner
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={() => setIsScanning(true)}
            icon={Play}
            className="py-3 shadow-md font-bold text-base bg-emerald-600 hover:bg-emerald-700"
          >
            Start Real-Time Video Defect Scanner
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Link to="/admin/map" className="block">
            <Button fullWidth variant="outline" size="md" icon={Map}>
              View GIS Live Map
            </Button>
          </Link>
          <Link to="/field/new" className="block">
            <Button fullWidth variant="secondary" size="md" icon={Camera}>
              Upload Photo / Video
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sliders, MapPin, CheckCircle2, ShieldAlert, Download, RefreshCw, Maximize2, X, Navigation } from 'lucide-react';
import axios from 'axios';

export default function ImageDetectView() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confidence, setConfidence] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saveToDb, setSaveToDb] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  // High-accuracy device GPS state
  const [deviceGps, setDeviceGps] = useState({ lat: null, lon: null, accuracy: null, status: 'Acquiring high-accuracy GPS...' });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceGps({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            status: `High-Accuracy GPS (±${Math.round(pos.coords.accuracy)}m)`
          });
        },
        (err) => {
          setDeviceGps({ lat: null, lon: null, accuracy: null, status: 'Device GPS unavailable (IP fallback will be used)' });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setSavedSuccess(false);
    }
  };

  const handleDetect = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setSavedSuccess(false);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence', confidence);
      formData.append('save_incident', saveToDb ? 'true' : 'false');
      formData.append('send_email_alert', sendEmail ? 'true' : 'false');

      if (deviceGps.lat && deviceGps.lon) {
        formData.append('lat', deviceGps.lat);
        formData.append('lon', deviceGps.lon);
        formData.append('loc_desc_custom', deviceGps.status);
      }

      const res = await axios.post('/api/detect/image', formData);
      setResult(res.data);
      if (res.data.saved_incident) {
        setSavedSuccess(true);
      }
    } catch (err) {
      alert('Detection failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Image Defect Inspection
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            High-resolution deep-learning road damage analysis with precise HTML5 device GPS geocoding
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-dark-800 border border-slate-700/60 text-cyan-400">
          <Navigation className="w-4 h-4 animate-pulse" />
          <span>{deviceGps.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* File Dropzone */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-semibold text-sm text-slate-200">Upload Inspection Photo</h3>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-dark-800/50 hover:bg-dark-800 transition group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <div className="p-3.5 rounded-full bg-blue-500/10 text-blue-400 mb-2 group-hover:scale-110 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Choose or Drag Photo'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Supports high-res JPG, PNG, WEBP</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {/* Confidence Slider & Actions */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Sliders className="w-4 h-4" />
                <h3 className="font-semibold text-sm">Confidence Sensitivity</h3>
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

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToDb}
                  onChange={(e) => setSaveToDb(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-dark-800 w-4 h-4"
                />
                Auto-Log Incident Record
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-dark-800 w-4 h-4"
                />
                Send Immediate Email Alert
              </label>
            </div>

            <button
              disabled={!selectedFile || loading}
              onClick={handleDetect}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Neural Inspection...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Run Defect Detection
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Large High-Resolution Previews */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h3 className="font-semibold text-base text-slate-200">High-Resolution Visual Viewport</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Image Frame */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Original Photo</span>
                  {previewUrl && (
                    <button 
                      onClick={() => setZoomImage(previewUrl)}
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" /> Zoom
                    </button>
                  )}
                </div>
                <div className="w-full h-80 md:h-[420px] bg-dark-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center relative group">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Original" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-600">No photo selected</span>
                  )}
                </div>
              </div>

              {/* Annotated Result Frame */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>YOLO Detection Result</span>
                  {result?.annotated_image && (
                    <button 
                      onClick={() => setZoomImage(result.annotated_image)}
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" /> Zoom
                    </button>
                  )}
                </div>
                <div className="w-full h-80 md:h-[420px] bg-dark-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center relative">
                  {result?.annotated_image ? (
                    <img src={result.annotated_image} alt="Annotated" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-600">
                      {loading ? 'Analyzing image pixels...' : 'Run detection to view bounding box overlays'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Results Details Bar */}
            {result && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-dark-800/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-slate-200">
                      {result.location?.description}
                    </span>
                  </div>

                  {savedSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      Logged in Incidents DB
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Detected Hazards ({result.detections?.length || 0}):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {result.detections?.map((det, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-dark-800 border border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-400">{det.label}</span>
                        <span className="font-mono text-slate-300 font-semibold">{(det.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button 
            onClick={() => setZoomImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={zoomImage} alt="Expanded View" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}

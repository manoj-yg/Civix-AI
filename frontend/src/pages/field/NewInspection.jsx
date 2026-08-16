import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { INFRASTRUCTURE_TYPES } from '../../constants/infrastructure';
import { Button } from '../../components/common/Button';
import { MapPin, Camera, Upload, Video, Navigation, CheckCircle2 } from 'lucide-react';
import { inspectionApi } from '../../api/inspection.api';

export const NewInspection = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('road');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [location, setLocation] = useState({ lat: 12.9716, lng: 77.5946, accuracy: 5, name: 'MG Road, Bangalore' });
  const [customLocationName, setCustomLocationName] = useState('');
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGPS();
  }, []);

  const fetchGPS = () => {
    if (!navigator.geolocation) return;
    setIsCapturingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          name: `GPS Fix (${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°)`,
        });
        setIsCapturingGPS(false);
      },
      (err) => {
        console.warn('GPS position error:', err);
        setIsCapturingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please capture or select an image/video first.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create inspection record header
      const createRes = await inspectionApi.createInspection({
        asset_type: selectedType,
        latitude: location.lat,
        longitude: location.lng,
        notes: customLocationName || location.name,
      });

      const inspectionId = createRes.id || createRes.data?.id;

      // 2. Upload media and trigger async AI job pipeline
      const uploadRes = await inspectionApi.uploadMedia(inspectionId, file);
      const jobId = uploadRes.job_id || uploadRes.data?.job_id;

      // 3. Navigate to real processing screen
      navigate(`/field/processing?inspection_id=${inspectionId}&job_id=${jobId || ''}`);
    } catch (err) {
      console.error('Failed to submit inspection:', err);
      alert(err.message || 'Failed to submit inspection. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Infrastructure Inspection</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Step 1 of 3: Infrastructure Type & Media Capture</p>
      </div>

      {/* Infrastructure Type Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          1. Select Infrastructure Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {INFRASTRUCTURE_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${type.color} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  {type.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{type.name}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Capture / Upload Box */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          2. Capture Media (Photo or Video)
        </label>

        {previewUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black aspect-video flex items-center justify-center">
            {file?.type?.startsWith('video') ? (
              <video src={previewUrl} controls className="max-h-full max-w-full object-contain" />
            ) : (
              <img src={previewUrl} alt="Capture preview" className="max-h-full max-w-full object-contain" />
            )}
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
              }}
              className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-xs font-semibold rounded-md backdrop-blur-xs"
            >
              Retake / Replace
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-900 text-center space-y-3">
            <div className="flex justify-center gap-3">
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 shadow-xs">
                <Camera className="w-4 h-4" />
                <span>Camera Photo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              </label>

              <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Supports JPG, PNG, MP4 video uploads (max 50 MB)</p>
          </div>
        )}
      </div>

      {/* GPS Location Confirmation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Captured Location Data</span>
          </div>
          <button
            type="button"
            onClick={fetchGPS}
            disabled={isCapturingGPS}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1"
          >
            <Navigation className={`w-3 h-3 ${isCapturingGPS ? 'animate-spin' : ''}`} />
            <span>Refresh GPS</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px]">Latitude</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{location.lat.toFixed(6)}°</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Longitude</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{location.lng.toFixed(6)}°</span>
          </div>
        </div>

        <input
          type="text"
          placeholder="Location landmark / manual notes (Optional)"
          value={customLocationName}
          onChange={(e) => setCustomLocationName(e.target.value)}
          className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="button"
        onClick={handleSubmit}
        loading={isSubmitting}
        disabled={!file}
        fullWidth
        size="lg"
      >
        Submit Inspection to AI Pipeline
      </Button>
    </div>
  );
};

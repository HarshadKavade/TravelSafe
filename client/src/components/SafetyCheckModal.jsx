import { useEffect, useState } from "react";

export default function SafetyCheckModal({ isOpen, onConfirmSafe, onTriggerSOS, countdownSeconds = 15 }) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdownSeconds);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTriggerSOS(); // Trigger emergency immediately when countdown expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onTriggerSOS, countdownSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-red-500/40 rounded-3xl p-8 text-center shadow-2xl shadow-red-900/10 animate-in fade-in zoom-in duration-200">
        
        {/* Warning Icon */}
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-4xl">⚠️</span>
        </div>

        {/* Header */}
        <h2 className="text-3xl font-bold text-red-500 mb-2">Safety Check-In</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Please confirm that you are safe. If you do not respond, the emergency SOS workflow will be triggered automatically.
        </p>

        {/* Countdown */}
        <div className="mb-8">
          <div className="text-6xl font-extrabold text-white tracking-tighter mb-2">
            {timeLeft}s
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / countdownSeconds) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onConfirmSafe}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-green-900/20 transition transform active:scale-95 cursor-pointer"
        >
          ✅ I'm Safe
        </button>
      </div>
    </div>
  );
}

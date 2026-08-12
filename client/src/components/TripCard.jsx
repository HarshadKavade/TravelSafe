export default function TripCard({ trip }) {
  const dateStr = trip.startedAt 
    ? new Date(trip.startedAt).toLocaleString() 
    : new Date(trip.createdAt).toLocaleString();

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">
            {dateStr}
          </span>
          <h4 className="font-bold text-gray-200 mt-1 line-clamp-1">
            To: {trip.destination?.address || "Destination"}
          </h4>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${trip.safetyScore >= 80 ? "bg-green-500/10 text-green-400" : trip.safetyScore >= 55 ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>
          {trip.safetyScore}% Safety
        </span>
      </div>

      <div className="text-xs text-gray-400 space-y-1 border-t border-zinc-900 pt-2">
        <p className="line-clamp-1"><strong className="text-gray-500">From:</strong> {trip.start?.address || "Start Location"}</p>
        <p><strong className="text-gray-500">Status:</strong> <span className="capitalize">{trip.status}</span></p>
      </div>
    </div>
  );
}

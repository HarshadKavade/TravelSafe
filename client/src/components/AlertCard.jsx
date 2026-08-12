export default function AlertCard({ alert }) {

  return (
    <div className="bg-zinc-900 p-5 rounded-2xl">

      <h2 className="text-red-500 font-bold mb-3">
        🚨 Emergency Alert
      </h2>

      <p>User: {alert.name}</p>

      <a
        href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
        target="_blank"
      >
        View Location
      </a>

      {/* 🎤 AUDIO PLAYER */}
      {
        alert.audioUrl && (

          <audio controls className="mt-4 w-full">

            <source
              src={alert.audioUrl}
              type="audio/mp3"
            />

          </audio>
        )
      }

    </div>
  );
}
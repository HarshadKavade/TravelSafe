import { useRef, useState }
from "react";

import axios from "axios";

export default function AudioRecorder({

  setAudioUrl

}) {

  const mediaRecorderRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const [recording,
    setRecording] = useState(false);

  // 🎤 START
  const startRecording =
    async () => {

      try {

        const stream =
          await navigator.mediaDevices
          .getUserMedia({
            audio: true
          });

        const mediaRecorder =
          new MediaRecorder(stream);

        mediaRecorderRef.current =
          mediaRecorder;

        mediaRecorder.ondataavailable =
          (e) => {
            chunksRef.current.push(e.data);
          };

        mediaRecorder.onstop =
          async () => {

            const blob =
              new Blob(
                chunksRef.current,
                {
                  type: "audio/webm"
                }
              );

            const formData =
              new FormData();

            formData.append(
              "audio",
              blob
            );

            // 🚀 upload
            const res =
              await axios.post(
                "http://localhost:5000/api/recordings/upload",
                formData
              );

            setAudioUrl(
              res.data.audioUrl
            );

            chunksRef.current = [];
          };

        mediaRecorder.start();

        setRecording(true);

      } catch (err) {

        console.log(err);
      }
  };

  // 🛑 STOP
  const stopRecording = () => {

    mediaRecorderRef.current.stop();

    setRecording(false);
  };

  return (

    <div>

      {
        !recording ? (

          <button
            onClick={startRecording}
            className="bg-red-600 px-6 py-3 rounded-xl"
          >
            🎤 Start Recording
          </button>

        ) : (

          <button
            onClick={stopRecording}
            className="bg-gray-700 px-6 py-3 rounded-xl"
          >
            🛑 Stop Recording
          </button>

        )
      }

    </div>
  );
}
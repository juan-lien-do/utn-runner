"use client";
import React, { useEffect, useRef, useState } from "react";

type OnHandDetected = (payload: {
  normalizedX: number; // 0..1
  normalizedY: number; // 0..1
  lane: "left" | "center" | "right" | null;
  isClosed: boolean;
}) => void;

interface Props {
  onHandDetected?: OnHandDetected;
  width?: number;
  height?: number;
}

export default function HandCameraImpl({ onHandDetected, width = 640, height = 480 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [activeLane, setActiveLane] = useState<"left" | "center" | "right" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let running = true;
    let stream: MediaStream | null = null;

    // references for cleanup
    let tasksHandLandmarker: any = null;
    let handsInstance: any = null;
    let cameraInstance: any = null;

    const log = (...args: any[]) => console.log("[HandCameraImpl]", ...args);

    async function startCamera() {
      const video = videoRef.current!;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width, height } });
        video.srcObject = stream;
        await video.play();
        // make canvas size match actual video pixels
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth || width;
        canvas.height = video.videoHeight || height;
      } catch (err: any) {
        log("getUserMedia failed:", err);
        setError("No se pudo acceder a la cámara. Verificá permisos y https/localhost.");
        throw err;
      }
    }

    function computeLane(normalizedX: number): "left" | "center" | "right" | null {
      if (normalizedX == null || Number.isNaN(normalizedX)) return null;
      // normalizedX is 0..1 left->right from camera; mirror if front camera? keep as-is first
      if (normalizedX < 1 / 3) return "left";
      if (normalizedX < 2 / 3) return "center";
      return "right";
    }

    function drawOverlay(ctx: CanvasRenderingContext2D, resultsLandmarks: Array<any> | null) {
      const canvas = canvasRef.current!;
      // draw semi-transparent overlay grid (3 columns)
      const w = canvas.width;
      const h = canvas.height;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 3, 0);
      ctx.lineTo(w / 3, h);
      ctx.moveTo((2 * w) / 3, 0);
      ctx.lineTo((2 * w) / 3, h);
      ctx.stroke();

      // draw landmarks if exist
      if (resultsLandmarks && resultsLandmarks.length > 0) {
        const hand = resultsLandmarks[0];
        ctx.strokeStyle = "#00FF00";
        ctx.fillStyle = "#00FF00";
        ctx.lineWidth = 2;

        // connections approximate (same indices as mediapipe)
        const connections: Array<[number, number]> = [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [0, 5], [5, 6], [6, 7], [7, 8],
          [0, 9], [9, 10], [10, 11], [11, 12],
          [0, 13], [13, 14], [14, 15], [15, 16],
          [0, 17], [17, 18], [18, 19], [19, 20],
        ];
        connections.forEach(([s, e]) => {
          const a = hand[s];
          const b = hand[e];
          ctx.beginPath();
          ctx.moveTo(a.x * w, a.y * h);
          ctx.lineTo(b.x * w, b.y * h);
          ctx.stroke();
        });

        hand.forEach((lm: any) => {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();
    }

    async function tryTasksVisionFlow() {
      log("Intentando cargar @mediapipe/tasks-vision (ruta WASM)...");
      try {
        const visionModule = await import("@mediapipe/tasks-vision");
        log("tasks-vision import ok", !!visionModule);
        const { FilesetResolver, HandLandmarker } = visionModule;

  // Use exact installed version to avoid 404s / wrong MIME responses from CDN
  const tasksVisionVersion = "0.10.22-rc.20250304"; // from installed package
  const wasmUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${tasksVisionVersion}/wasm`;
        log("FilesetResolver.forVisionTasks ->", wasmUrl);
        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        log("vision fileset ok");

        tasksHandLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          numHands: 1,
          runningMode: "VIDEO",
        });
        log("HandLandmarker creado (tasks-vision).");

        // detection loop using detectForVideo
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        const detect = async () => {
          if (!running) return;
          if (video.readyState >= 2 && tasksHandLandmarker) {
            try {
              const results = await tasksHandLandmarker.detectForVideo(video, performance.now());
              // results may come in different shapes; try to normalize
              const landmarks = (results && (results.landmarks || results.multiHandLandmarks || results.handLandmarks)) || null;

              // draw video and overlay
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              drawOverlay(ctx, landmarks);

              if (landmarks && landmarks.length > 0) {
                const hand = landmarks[0];
                const wrist = hand[0];
                const normX = wrist.x;
                const normY = wrist.y;
                const lane = computeLane(normX);
                // estimate open/closed by fingertip-to-palm distances
                const palm = hand[0];
                const tips = [4, 8, 12, 16, 20]
                  .map((i) => Math.hypot(hand[i].x - palm.x, hand[i].y - palm.y))
                  .reduce((a, b) => a + b, 0) / 5;
                const isClosed = tips < 0.12; // threshold empiric
                setActiveLane(lane);
                onHandDetected?.({ normalizedX: normX, normalizedY: normY, lane, isClosed });
              } else {
                setActiveLane(null);
                onHandDetected?.({ normalizedX: NaN, normalizedY: NaN, lane: null, isClosed: false });
              }
            } catch (err) {
              console.warn("tasks-vision detect error:", err);
            }
          }
          animationRef.current = requestAnimationFrame(detect);
        };

        detect();
        return true;
      } catch (err: any) {
        log("tasks-vision fallo:", err?.message ?? err);
        return false;
      }
    }

    async function tryHandsFallback() {
      log("Fallback: intentando cargar @mediapipe/hands + camera_utils ...");
      try {
        const HandsModule = await import("@mediapipe/hands");
        const CameraModule = await import("@mediapipe/camera_utils");
        // Camera export shape can vary similarly to Hands.
        let CameraCtor: any = undefined;
        if (CameraModule) {
          if (typeof CameraModule.Camera === "function") CameraCtor = CameraModule.Camera;
          else if (CameraModule.default) {
            if (typeof CameraModule.default === "function") CameraCtor = CameraModule.default;
            else if (typeof CameraModule.default.Camera === "function") CameraCtor = CameraModule.default.Camera;
          }
          if (!CameraCtor && typeof window !== "undefined" && (window as any).Camera) CameraCtor = (window as any).Camera;
        }

        // The @mediapipe packages sometimes export differently depending on bundler/UMD/Esm.
        // Be defensive and support multiple shapes: named export, default, or global-like factory.
        const getHandsConstructor = (mod: any) => {
          if (!mod) return undefined;
          // named export
          if (typeof mod.Hands === "function") return mod.Hands;
          // default export could be the factory/class or an object with Hands
          if (mod.default) {
            if (typeof mod.default === "function") return mod.default;
            if (typeof mod.default.Hands === "function") return mod.default.Hands;
          }
          // some builds attach to window (UMD); try to pick window.Hands if available
          if (typeof window !== "undefined" && (window as any).Hands) return (window as any).Hands;
          return undefined;
        };

        const HandsCtor = getHandsConstructor(HandsModule);
        if (!HandsCtor) throw new Error("No se encontró un constructor Hands exportado por @mediapipe/hands (formas probadas: Hands, default, window.Hands)");

        // Use a CDN path that matches the installed package version if possible. Keep a conservative known-good version.
        const handsCdnVersion = "0.4.1675469240"; // from installed package

        handsInstance = new HandsCtor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${handsCdnVersion}/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        handsInstance.onResults((results: any) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const multi = results.multiHandLandmarks || [];
          drawOverlay(ctx, multi.length > 0 ? multi : null);

          if (multi.length > 0) {
            const hand = multi[0];
            const wrist = hand[0];
            const normX = wrist.x;
            const normY = wrist.y;
            const lane = computeLane(normX);

            const palm = hand[0];
            const tips = [4, 8, 12, 16, 20]
              .map((i) => Math.hypot(hand[i].x - palm.x, hand[i].y - palm.y))
              .reduce((a, b) => a + b, 0) / 5;
            const isClosed = tips < 0.12;

            setActiveLane(lane);
            onHandDetected?.({ normalizedX: normX, normalizedY: normY, lane, isClosed });
          } else {
            setActiveLane(null);
            onHandDetected?.({ normalizedX: NaN, normalizedY: NaN, lane: null, isClosed: false });
          }
        });

        // Camera util to call handsInstance.send({image: video})
        if (!CameraCtor) throw new Error("No se encontró constructor Camera exportado por @mediapipe/camera_utils (formas probadas: Camera, default, window.Camera)");

        cameraInstance = new CameraCtor(video, {
          onFrame: async () => {
            await handsInstance.send({ image: video });
          },
          width,
          height,
        });
        await cameraInstance.start();
        log("Fallback @mediapipe/hands started.");
        return true;
      } catch (err: any) {
        log("Fallback hands failed:", err?.message ?? err);
        return false;
      }
    }

    (async () => {
      try {
        await startCamera();
      } catch (err) {
        // camera failed - abort
        return;
      }

      // First try tasks-vision (WASM). If it fails, fallback to @mediapipe/hands.
      const okTasks = await tryTasksVisionFlow();
      if (!okTasks) {
        log("tasks-vision no funcionó, probando fallback...");
        const okFallback = await tryHandsFallback();
        if (!okFallback) {
          setError(
            "No se pudo inicializar MediaPipe (tasks-vision ni fallback). Revisá la consola y la red (WASM/CDN).",
          );
        }
      }
    })();

    // cleanup
    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      try {
        if (tasksHandLandmarker) {
          tasksHandLandmarker.close?.();
        }
      } catch {}
      try {
        if (handsInstance) {
          handsInstance.close?.();
        }
      } catch {}
      try {
        if (cameraInstance) {
          cameraInstance.stop?.();
        }
      } catch {}
    };
  }, [onHandDetected, width, height]);

  return (
    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center border-2 border-white/20 rounded-lg overflow-hidden">
      {error ? (
        <div className="text-white text-center p-4">
          <p className="text-lg font-semibold">{error}</p>
          <p className="text-sm opacity-75">Verifica permisos de cámara y consola para más detalles.</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ display: "none" }} />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex pointer-events-none">
            <div className={`flex-1 border-r border-white/30 flex items-center justify-center transition-colors ${activeLane === "left" ? "bg-green-500/30" : "bg-green-500/10"}`}>
              <span className="text-white/70 text-sm font-semibold">IZQUIERDA</span>
            </div>
            <div className={`flex-1 border-r border-white/30 flex items-center justify-center transition-colors ${activeLane === "center" ? "bg-yellow-500/30" : "bg-yellow-500/10"}`}>
              <span className="text-white/70 text-sm font-semibold">CENTRO</span>
            </div>
            <div className={`flex-1 flex items-center justify-center transition-colors ${activeLane === "right" ? "bg-red-500/30" : "bg-red-500/10"}`}>
              <span className="text-white/70 text-sm font-semibold">DERECHA</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

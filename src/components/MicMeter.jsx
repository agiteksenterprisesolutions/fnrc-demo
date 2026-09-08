import { useEffect, useRef } from 'react';

/**
 * A live level meter for the caller's own microphone, so the panel shows that
 * it is hearing them. Reads the published track, which is exactly what the
 * assistant receives.
 */
const BAR_COUNT = 13;

const MicMeter = ({ stream, active }) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    let audioContext = null;
    let analyser = null;
    let source = null;
    let data = null;
    const levels = new Array(BAR_COUNT).fill(0);

    if (active && stream) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);
      } catch (error) {
        console.warn('FNRC - microphone meter unavailable:', error);
      }
    }

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);

      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      if (analyser) analyser.getByteFrequencyData(data);

      const gap = 4;
      const barWidth = Math.max((width - gap * (BAR_COUNT - 1)) / BAR_COUNT, 2);
      const now = Date.now() / 260;

      for (let i = 0; i < BAR_COUNT; i += 1) {
        let target;
        if (analyser) {
          // The speech band, spread across the bars.
          const from = Math.floor((i / BAR_COUNT) * (data.length * 0.5));
          const to = Math.floor(((i + 1) / BAR_COUNT) * (data.length * 0.5));
          let sum = 0;
          for (let j = from; j < to; j += 1) sum += data[j];
          target = Math.min((sum / Math.max(to - from, 1) / 255) * 1.7, 1);
        } else {
          // No track yet: a slow idle wave rather than a dead row.
          target = 0.12 + Math.sin(now + i * 0.5) * 0.06;
        }
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.5 : 0.16);

        const barHeight = Math.max(height * 0.16, levels[i] * height * 0.92);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        context.fillStyle = '#7c5e24';
        context.globalAlpha = 0.35 + levels[i] * 0.65;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    draw();

    return () => {
      cancelAnimationFrame(frameRef.current);
      try {
        source?.disconnect();
        audioContext?.close();
      } catch (error) {
        /* already torn down */
      }
    };
  }, [stream, active]);

  return (
    <div className="flex h-11 flex-1 items-center rounded-2xl border border-fnrc-line bg-fnrc-tint px-4">
      <canvas ref={canvasRef} className="h-6 w-full" aria-hidden="true" />
      <span className="sr-only">Microphone is live</span>
    </div>
  );
};

export default MicMeter;

// fnrc/src/components/FnrcChatWidget.jsx
//
// The FNRC voice assistant. Deliberately not the Xposer reporting widget: the
// caller here is anonymous, there is no report to open and nothing to
// authenticate against, so the whole credential/report/upload apparatus is
// absent rather than disabled.
//
// The agent's contract is two attributes on the LiveKit token:
//
//   language      en ar ur hi es fr de pt tr ru zh | auto   (default auto)
//   voice_output  on | off                                  (default on)
//
// Both are strings — LiveKit types participant attributes as
// map<string,string>, so "on" rather than true.
//
// Language is read once, at join: it builds the recogniser, chooses the spoken
// welcome and locks the reply language. Changing it later does nothing, which
// is why it is asked before the room opens and why switching it tears the call
// down and reconnects.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Volume2,
  X,
} from 'lucide-react';
import MicMeter from './MicMeter';
import { LANGUAGES, getCopy, getLanguageName, isRtlLanguage } from '../languages';

// Where the token is minted. The LiveKit API secret signs it, so this is a
// server the browser talks to — never a key shipped in the bundle.
const TOKEN_ENDPOINT = import.meta.env.VITE_FNRC_TOKEN_ENDPOINT || '/api/token';

// Renamed from the reporting agent's topics. A missed rename fails silently —
// the toggle simply stops working — so both live here as constants.
// Served from fnrc/public, which Vite exposes at the site root.
const LOGO_SRC = '/logo.png';

const CONTROL_TOPIC = 'fnrc-control';
const EVENT_TOPIC = 'fnrc-events';

// The assistant confirms every voice change with a `voice.state` event, so the
// toggle is never driven optimistically; this is only how long the control
// stays busy before it gives up waiting.
const VOICE_STATE_TIMEOUT_MS = 5000;

// If the assistant never speaks first, unlock the composer anyway rather than
// trapping the caller behind a greeting that is not coming.
const GREETING_TIMEOUT_MS = 30000;
const TYPING_TIMEOUT_MS = 60000;
const COMPOSER_MAX_HEIGHT = 120;

const newRoomName = () =>
  `fnrc-${
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }`;

/**
 * Folds one transcription chunk into the text collected so far. A chunk that
 * already starts with everything collected is the same utterance re-sent in
 * full, not a piece to append — appending it gives "hellohello".
 */
const foldChunk = (collected, chunk) =>
  collected && chunk.startsWith(collected) ? chunk : collected + chunk;

const TypingDots = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    className="flex justify-start"
    role="status"
    aria-label="The assistant is replying"
  >
    <div className="flex items-center gap-1.5 rounded-2xl bg-fnrc-soft px-4 py-3">
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          className="block h-1.5 w-1.5 rounded-full bg-fnrc/60"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay }}
        />
      ))}
    </div>
  </motion.div>
);

const ConnectingState = ({ hasToken, isConnected, agentReady, languageName }) => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), 9000);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    { label: 'Opening a secure room', done: hasToken },
    { label: languageName ? `Connecting in ${languageName}` : 'Connecting', done: isConnected },
    { label: 'Waking the assistant', done: agentReady },
  ];
  const activeIndex = steps.findIndex((step) => !step.done);

  return (
    <div className="flex min-h-[80%] flex-col items-center justify-center px-6 py-8 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        {[0, 0.6, 1.2].map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-0 rounded-full border border-fnrc/40"
            initial={{ scale: 0.6, opacity: 0.45 }}
            animate={{ scale: 1.35, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay }}
          />
        ))}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-fnrc text-white">
          <Headphones size={22} />
        </div>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-ink">Setting up your conversation</h3>
      <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-ink-soft">
        This takes a few seconds. The assistant will open the conversation.
      </p>

      <ul className="mt-5 w-full max-w-[15rem] space-y-2 text-left">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`flex items-center gap-2.5 text-xs ${
              step.done ? 'text-ink-soft' : index === activeIndex ? 'text-ink' : 'text-ink-soft/50'
            }`}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {step.done ? (
                <span className="text-fnrc">✓</span>
              ) : index === activeIndex ? (
                <Loader2 size={13} className="animate-spin text-fnrc" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-fnrc-line" />
              )}
            </span>
            {step.label}
          </li>
        ))}
      </ul>

      {isSlow && (
        <p className="mt-5 max-w-[16rem] text-[11px] leading-relaxed text-ink-soft/70">
          Still working — a slow connection can make this take a little longer.
        </p>
      )}
    </div>
  );
};

export default function FnrcChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  // Chosen before the room opens, because both travel on the token.
  const [pendingLanguage, setPendingLanguage] = useState(null);
  const [language, setLanguage] = useState(null);
  const [voiceOutput, setVoiceOutput] = useState(true);

  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentReady, setAgentReady] = useState(false);

  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [micStream, setMicStream] = useState(null);

  // What the assistant says it is doing, from its own `voice.state` events —
  // not what this client asked for.
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voicePending, setVoicePending] = useState(false);

  const roomRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const agentAudioElsRef = useRef([]);
  const handlerRegistered = useRef(false);
  const voiceEnabledRef = useRef(true);
  const voicePendingTimer = useRef(null);
  const typingTimer = useRef(null);
  const greetingTimer = useRef(null);
  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);

  const copy = getCopy(pendingLanguage || language);
  const rtl = isRtlLanguage(pendingLanguage || language);
  const composerLocked = !isConnected || !agentReady;

  // ── typing indicator ───────────────────────────────────────────────
  const startTyping = () => {
    setIsTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), TYPING_TIMEOUT_MS);
  };
  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    setIsTyping(false);
  };

  useEffect(
    () => () => {
      clearTimeout(typingTimer.current);
      clearTimeout(voicePendingTimer.current);
      clearTimeout(greetingTimer.current);
    },
    [],
  );

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    // Text mode is honoured in the browser as well as asked for on the wire.
    agentAudioElsRef.current.forEach((el) => {
      el.muted = !voiceEnabled;
    });
  }, [voiceEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // The composer grows with what is typed and stops at COMPOSER_MAX_HEIGHT.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const styles = window.getComputedStyle(el);
    const border =
      parseFloat(styles.borderTopWidth || 0) + parseFloat(styles.borderBottomWidth || 0);
    const needed = el.scrollHeight + border;
    el.style.height = `${Math.min(needed, COMPOSER_MAX_HEIGHT)}px`;
    el.style.overflowY = needed > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [inputValue, isMicEnabled, isOpen]);

  // Safety valve on the greeting.
  useEffect(() => {
    if (!isConnected || agentReady) {
      clearTimeout(greetingTimer.current);
      return undefined;
    }
    greetingTimer.current = setTimeout(() => setAgentReady(true), GREETING_TIMEOUT_MS);
    return () => clearTimeout(greetingTimer.current);
  }, [isConnected, agentReady]);

  // ── token ──────────────────────────────────────────────────────────
  const fetchToken = useCallback(async (languageCode, voiceMode) => {
    setIsLoadingToken(true);
    setTokenError(null);
    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Opaque: the room name is no longer parsed for anything.
          room_name: newRoomName(),
          participant_name: 'Caller',
          participant_attributes: {
            language: languageCode,
            voice_output: voiceMode ? 'on' : 'off',
          },
        }),
      });

      if (!response.ok) throw new Error(`Token request failed (${response.status})`);

      const data = await response.json();
      const participantToken = data.participant_token ?? data.participantToken;
      const url = data.server_url ?? data.serverUrl ?? import.meta.env.VITE_LIVEKIT_URL;
      if (!participantToken || !url) throw new Error('Token response was incomplete');

      setToken(participantToken);
      setServerUrl(url);
      // The token carries the choice; the assistant confirms it once live.
      setVoiceEnabled(voiceMode);
      voiceEnabledRef.current = voiceMode;
    } catch (error) {
      console.error('FNRC - token error:', error);
      setTokenError(
        'We could not start the call. Please check your connection and try again.',
      );
      setPendingLanguage(null);
      setLanguage(null);
    } finally {
      setIsLoadingToken(false);
    }
  }, []);

  // ── room ───────────────────────────────────────────────────────────
  const publishVoicePreference = (room, enabled) =>
    room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ enabled })),
      { reliable: true, topic: CONTROL_TOPIC },
    );

  const setupRoom = (room) => {
    room.on(RoomEvent.Connected, () => {
      setIsConnected(true);
      // The token already carries the choice. Restating it once the room is
      // live corrects a call that opened speaking against the caller's wish.
      if (!voiceEnabledRef.current) {
        publishVoicePreference(room, false).catch(() => {});
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      setIsMicEnabled(false);
      setMicStream(null);
      setAgentReady(false);
      handlerRegistered.current = false;
    });

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (participant.identity === room.localParticipant.identity) return;
      const el = track.attach();
      el.muted = !voiceEnabledRef.current;
      agentAudioElsRef.current.push(el);
      el.play().catch(() => {
        // Autoplay can be blocked until the page is interacted with.
        document.addEventListener('click', () => el.play().catch(() => {}), { once: true });
      });
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      track.detach().forEach((el) => {
        agentAudioElsRef.current = agentAudioElsRef.current.filter((e) => e !== el);
        el.remove?.();
      });
    });

    // The only inbound event now. Nothing is submitted and nothing closes
    // itself, so there is no report.submitted / report.closing to handle.
    room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
      if (topic !== EVENT_TOPIC) return;
      let event;
      try {
        event = JSON.parse(new TextDecoder().decode(payload));
      } catch (error) {
        console.error('FNRC - unreadable event:', error);
        return;
      }
      if (event?.type === 'voice.state') {
        clearTimeout(voicePendingTimer.current);
        setVoicePending(false);
        setVoiceEnabled(event.enabled !== false);
      }
    });

    if (handlerRegistered.current) return;
    room.registerTextStreamHandler('lk.transcription', async (reader, participantInfo) => {
      const info = reader.info;
      const isCaller = participantInfo.identity === room.localParticipant.identity;
      const sender = isCaller ? 'user' : 'agent';
      // One utterance keeps its segment id across the interim and final
      // transcriptions it is delivered as, where the stream id does not.
      const segmentId = info.attributes?.['lk.segment_id'] || info.id;
      const mergeId = sender === 'agent' ? info.id : segmentId;

      if (sender === 'agent') startTyping();
      let full = '';

      for await (const chunk of reader) {
        const piece = String(chunk);
        full = sender === 'user' ? foldChunk(full, piece) : full + piece;
        if (sender === 'agent') stopTyping();

        setMessages((prev) => {
          const existing = prev.find((m) => m.mergeId === mergeId);
          if (existing) {
            return prev.map((m) =>
              m.mergeId === mergeId
                ? { ...m, content: full, isStreaming: sender === 'agent' }
                : m,
            );
          }
          return [
            ...prev,
            {
              id: `${mergeId}_${Date.now()}`,
              mergeId,
              content: full,
              role: sender,
              isStreaming: sender === 'agent',
            },
          ];
        });
      }

      if (sender === 'user') {
        // The caller has finished; the assistant's answer is what comes next.
        startTyping();
      } else {
        setAgentReady(true);
        setMessages((prev) =>
          prev.map((m) => (m.mergeId === mergeId ? { ...m, isStreaming: false } : m)),
        );
      }
    });
    handlerRegistered.current = true;
  };

  const connect = useCallback(async () => {
    try {
      const room = new Room({
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      roomRef.current = room;
      setAgentReady(false);
      setupRoom(room);
      await room.connect(serverUrl, token);
    } catch (error) {
      console.error('FNRC - connection error:', error);
      setTokenError('We could not connect the call. Please try again.');
      setToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, token]);

  useEffect(() => {
    if (token && serverUrl && isOpen && !roomRef.current) connect();
  }, [token, serverUrl, isOpen, connect]);

  const teardown = () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.removeAllListeners();
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    agentAudioElsRef.current.forEach((el) => el.remove?.());
    agentAudioElsRef.current = [];
    handlerRegistered.current = false;
    clearTimeout(voicePendingTimer.current);
    clearTimeout(typingTimer.current);
    setIsConnected(false);
    setIsMicEnabled(false);
    setMicStream(null);
    setAgentReady(false);
    setVoicePending(false);
    setIsTyping(false);
    setToken(null);
    setServerUrl(null);
  };

  // The call no longer ends itself — there is no submission to finish — so
  // ending it is the caller's decision and needs a control of its own.
  const endCall = () => {
    teardown();
    setCallEnded(true);
  };

  const startOver = () => {
    teardown();
    setCallEnded(false);
    setMessages([]);
    setInputValue('');
    setPendingLanguage(null);
    setLanguage(null);
    setTokenError(null);
  };

  const closeWidget = () => {
    teardown();
    setIsOpen(false);
    setCallEnded(false);
    setMessages([]);
    setInputValue('');
    setPendingLanguage(null);
    setLanguage(null);
  };

  // ── the two pre-call answers ───────────────────────────────────────
  const pickLanguage = (code) => {
    setPendingLanguage(code);
    setTokenError(null);
  };

  const pickMode = (voiceMode) => {
    const code = pendingLanguage || 'auto';
    setVoiceOutput(voiceMode);
    setLanguage(code);
    fetchToken(code, voiceMode);
  };

  // ── in-call controls ───────────────────────────────────────────────
  const setVoiceMode = async (next) => {
    if (!roomRef.current || !isConnected || voicePending || next === voiceEnabled) return;
    setVoicePending(true);
    clearTimeout(voicePendingTimer.current);
    try {
      await publishVoicePreference(roomRef.current, next);
      voicePendingTimer.current = setTimeout(
        () => setVoicePending(false),
        VOICE_STATE_TIMEOUT_MS,
      );
    } catch (error) {
      console.error('FNRC - could not switch reply mode:', error);
      setVoicePending(false);
    }
  };

  const toggleMic = async () => {
    if (!roomRef.current || !isConnected) return;
    try {
      if (isMicEnabled) {
        if (localAudioTrackRef.current) {
          await roomRef.current.localParticipant.unpublishTrack(localAudioTrackRef.current);
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current = null;
        }
        await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        setMicStream(null);
        setIsMicEnabled(false);
      } else {
        await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        const tracks = Array.from(
          roomRef.current.localParticipant.audioTrackPublications.values(),
        );
        localAudioTrackRef.current = tracks[0]?.audioTrack || null;
        const mediaTrack = localAudioTrackRef.current?.mediaStreamTrack;
        setMicStream(mediaTrack ? new MediaStream([mediaTrack]) : null);
        setIsMicEnabled(true);
      }
    } catch (error) {
      console.error('FNRC - microphone error:', error);
      setIsMicEnabled(false);
    }
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || !roomRef.current || composerLocked) return;

    setMessages((prev) => [
      ...prev,
      { id: `typed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, content: message, role: 'user' },
    ]);
    setInputValue('');

    try {
      await roomRef.current.localParticipant.sendText(message, { topic: 'lk.chat' });
      startTyping();
    } catch (error) {
      console.error('FNRC - could not send message:', error);
      stopTyping();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const showComposer = (isConnected || messages.length > 0) && !callEnded;

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsOpen(true)}
            title="Talk to the assistant"
            aria-label="Talk to the FNRC assistant"
            className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-fnrc shadow-lg shadow-fnrc/30 transition-shadow hover:shadow-xl sm:bottom-8 sm:right-8"
          >
            {/* The figure deliberately breaks out of the disc — head above the
                top edge, shoulders past the sides — so the button reads as a
                person standing in front of the FNRC bronze, not a photo
                cropped into a circle. Hence no overflow-hidden here. */}
            <img
              src={LOGO_SRC}
              alt=""
              className="pointer-events-none absolute bottom-[-4%] left-1/2 h-[122%] w-auto max-w-none -translate-x-1/2 drop-shadow-md"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[38rem] sm:max-h-[85vh] sm:w-[26rem] sm:rounded-3xl sm:border sm:border-fnrc-line sm:shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-fnrc-line bg-fnrc px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Headphones size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">FNRC Assistant</p>
                  <p className="truncate text-[11px] text-white/70">
                    {isConnected ? 'Connected' : 'Fujairah Natural Resources'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {/* Two halves rather than one label that flips: the caller can
                    see which mode is live without working out whether the
                    label names the state or the action. */}
                {isConnected && (
                  <div
                    role="group"
                    aria-label="How the assistant replies"
                    className="flex items-center gap-0.5 rounded-full bg-white/15 p-0.5"
                  >
                    {[
                      { enabled: true, label: 'Voice', Icon: Volume2 },
                      { enabled: false, label: 'Text', Icon: MessageSquareText },
                    ].map(({ enabled, label, Icon }) => {
                      const active = voiceEnabled === enabled;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setVoiceMode(enabled)}
                          disabled={voicePending}
                          aria-pressed={active}
                          className={`relative inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-60 ${
                            active ? 'text-fnrc' : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="fnrc-voice-thumb"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                              className="absolute inset-0 rounded-full bg-white"
                            />
                          )}
                          <span className="relative flex items-center gap-1">
                            {!active && voicePending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Icon size={11} />
                            )}
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isConnected && (
                  <button
                    onClick={endCall}
                    title="End call"
                    aria-label="End call"
                    className="rounded-full bg-white/15 p-1.5 text-white transition-colors hover:bg-white/25"
                  >
                    <PhoneOff size={14} />
                  </button>
                )}

                <button
                  onClick={closeWidget}
                  title="Close"
                  aria-label="Close the assistant"
                  className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Transcript */}
            <div className="fnrc-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {callEnded ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fnrc-soft text-fnrc">
                    <PhoneOff size={20} />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-ink">Call ended</h3>
                  <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-ink-soft">
                    Thank you for contacting Fujairah Natural Resources Corporation. You can
                    start again whenever you need to.
                  </p>
                  <button
                    onClick={startOver}
                    className="mt-5 rounded-full bg-fnrc px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-fnrc-dark"
                  >
                    Start a new call
                  </button>
                </div>
              ) : (
                <>
                  {!language && (
                    <div className="space-y-3">
                      {getCopy(pendingLanguage || 'en').greeting.map((line, index) => (
                        <motion.div
                          key={line}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.12 }}
                          className="flex justify-start"
                        >
                          <div className="max-w-[85%] rounded-2xl bg-fnrc-soft px-4 py-2.5 text-sm text-ink [overflow-wrap:anywhere]">
                            {line}
                          </div>
                        </motion.div>
                      ))}

                      {!pendingLanguage ? (
                        <>
                          <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl bg-fnrc-soft px-4 py-2.5 text-sm text-ink">
                              {getCopy('en').languageQuestion}
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2 pt-1">
                            {LANGUAGES.map((entry) => (
                              <button
                                key={entry.code}
                                onClick={() => pickLanguage(entry.code)}
                                disabled={isLoadingToken}
                                dir={entry.rtl ? 'rtl' : 'ltr'}
                                lang={entry.code}
                                className="rounded-full border border-fnrc/40 px-3.5 py-1.5 text-sm text-fnrc transition-colors hover:bg-fnrc hover:text-white disabled:opacity-50"
                              >
                                {entry.native}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-end">
                            <div
                              dir="auto"
                              className="rounded-2xl bg-fnrc px-4 py-2.5 text-sm text-white"
                            >
                              {getLanguageName(pendingLanguage)}
                            </div>
                          </div>

                          <div className="flex justify-start">
                            <div
                              dir={rtl ? 'rtl' : 'ltr'}
                              lang={pendingLanguage}
                              className="max-w-[85%] rounded-2xl bg-fnrc-soft px-4 py-2.5 text-sm text-ink"
                            >
                              {copy.question}
                            </div>
                          </div>

                          <div
                            dir={rtl ? 'rtl' : 'ltr'}
                            lang={pendingLanguage}
                            className="mx-auto w-full max-w-sm pt-2"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                onClick={() => pickMode(true)}
                                disabled={isLoadingToken}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fnrc px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-fnrc-dark disabled:opacity-50"
                              >
                                <Volume2 size={16} />
                                {copy.speak}
                              </button>
                              <button
                                onClick={() => pickMode(false)}
                                disabled={isLoadingToken}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-fnrc/40 px-4 py-2.5 text-sm font-medium text-fnrc transition-colors hover:bg-fnrc-soft disabled:opacity-50"
                              >
                                <MessageSquareText size={16} />
                                {copy.text}
                              </button>
                            </div>
                            <p className="mt-2 text-center text-[11px] leading-snug text-ink-soft">
                              {copy.hint}
                            </p>
                            <button
                              onClick={() => setPendingLanguage(null)}
                              disabled={isLoadingToken}
                              className="mx-auto mt-2 block text-[11px] text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-50"
                            >
                              {copy.changeLanguage}
                            </button>
                          </div>
                        </>
                      )}

                      {tokenError && (
                        <p className="pt-1 text-center text-xs text-red-600">{tokenError}</p>
                      )}
                    </div>
                  )}

                  {language && messages.length === 0 && composerLocked && (
                    <ConnectingState
                      hasToken={Boolean(token)}
                      isConnected={isConnected}
                      agentReady={agentReady}
                      languageName={getLanguageName(language)}
                    />
                  )}

                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          dir="auto"
                          className={`min-w-0 max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm [overflow-wrap:anywhere] ${
                            isUser ? 'bg-fnrc text-white' : 'bg-fnrc-soft text-ink'
                          }`}
                        >
                          {message.content}
                          {message.isStreaming && <span className="opacity-60">▌</span>}
                        </div>
                      </div>
                    );
                  })}

                  <AnimatePresence>{isTyping && <TypingDots />}</AnimatePresence>
                </>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {showComposer && (
              <div className="border-t border-fnrc-line px-3 py-3">
                <div className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 items-end">
                    {isMicEnabled ? (
                      <MicMeter stream={micStream} active={isMicEnabled} />
                    ) : (
                      <textarea
                        ref={composerRef}
                        rows={1}
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={composerLocked}
                        placeholder={
                          composerLocked ? 'Waiting for the assistant...' : 'Type a message...'
                        }
                        style={{ maxHeight: COMPOSER_MAX_HEIGHT }}
                        className="fnrc-scroll min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-fnrc-line bg-white px-4 py-2.5 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-fnrc disabled:opacity-50"
                      />
                    )}
                  </div>

                  <button
                    onClick={toggleMic}
                    disabled={composerLocked}
                    aria-pressed={isMicEnabled}
                    aria-label={isMicEnabled ? 'Stop the microphone' : 'Start the microphone'}
                    title={isMicEnabled ? 'Stop the microphone' : 'Start the microphone'}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                      isMicEnabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-fnrc-soft text-fnrc hover:bg-fnrc-line'
                    }`}
                  >
                    {isMicEnabled ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <button
                    onClick={sendMessage}
                    disabled={composerLocked || !inputValue.trim()}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fnrc text-white transition-colors hover:bg-fnrc-dark disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] leading-snug text-ink-soft/70">
                  The assistant can make mistakes. Verify important details.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

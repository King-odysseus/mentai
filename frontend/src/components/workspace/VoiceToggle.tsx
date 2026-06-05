import { useVoice } from "../../hooks/useVoice";
import styles from "./TutorChat.module.css";

export default function VoiceToggle() {
  const { enabled, listening, speaking, toggle } = useVoice();

  let icon = "🔇";
  let title = "Voice off — click to enable";
  let className = styles.voiceOff;

  if (enabled) {
    if (listening) {
      icon = "🎤";
      title = "Listening… — click to mute";
      className = styles.voiceListening;
    } else if (speaking) {
      icon = "🔊";
      title = "Tutor speaking… — click to mute";
      className = styles.voiceSpeaking;
    } else {
      icon = "🎤";
      title = "Voice on — click to mute";
      className = styles.voiceOn;
    }
  }

  return (
    <button
      type="button"
      className={`${styles.voiceBtn} ${className}`}
      onClick={toggle}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
}

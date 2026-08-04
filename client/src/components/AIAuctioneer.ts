export class AIAuctioneer {
  private static enabled = true;
  private static synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static voice: SpeechSynthesisVoice | null = null;

  static init() {
    if (!this.synth) return;
    const loadVoices = () => {
      if (!this.synth) return;
      const voices = this.synth.getVoices();
      this.voice =
        voices.find((v) => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Samantha'))) ||
        voices[0];
    };
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  static toggle(enable?: boolean) {
    if (enable !== undefined) {
      this.enabled = enable;
    } else {
      this.enabled = !this.enabled;
    }
  }

  static isEnabled() {
    return this.enabled;
  }

  private static speak(text: string) {
    if (!this.enabled || !this.synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    this.synth.speak(utterance);
  }

  static announceNewPlayer(name: string, category: string, basePrice: number) {
    this.speak(`Up next is ${category} ${name}, starting base price ${basePrice} lakhs.`);
  }

  static announceBid(teamName: string, amount: number) {
    this.speak(`Bid is ${amount} lakhs by ${teamName}.`);
  }

  static announceSold(playerName: string, teamName: string, amount: number) {
    this.speak(`Sold! ${playerName} goes to ${teamName} for ${amount} lakhs!`);
  }

  static announceUnsold(playerName: string) {
    this.speak(`${playerName} goes unsold.`);
  }

  static announceCountdown(seconds: number) {
    if (seconds === 2) {
      this.speak('Going once...');
    } else if (seconds === 1) {
      this.speak('Going twice...');
    }
  }
}

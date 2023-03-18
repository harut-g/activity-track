interface ITracker {
  track(event: string, ...tags: string[]): void;
}
interface IEvent {
  event: string;
  tags: string[];
  url: string;
  title: string;
  ts: number;
}

class Tracker implements ITracker {
  private static instance: Tracker;
  private readonly eventsMinCount: number = 3;
  private readonly interval: NodeJS.Timer;
  private buffer: IEvent[] = [];
  private pendingRequest: boolean = false;

  private constructor() {
    window.addEventListener('beforeunload', () => {
      clearInterval(this.interval);
      this.sendBuffer();
    });

    this.interval = setInterval(() => {
      this.sendBuffer();
    }, 1000);
  }

  public static getInstance(): Tracker {
    if (!Tracker.instance) {
      Tracker.instance = new Tracker();
    }
    return Tracker.instance;
  }

  public track(event: string, ...tags: string[]): void {
    const eventData: IEvent = {
      event,
      tags,
      url: window.location.href,
      title: document.title,
      ts: Math.floor(Date.now() / 1000),
    };
    this.buffer.push(eventData);

    if (this.buffer.length === this.eventsMinCount) {
      this.sendBuffer();
    }
  }

  private async sendBuffer(): Promise<void> {
    if (this.pendingRequest || this.buffer.length === 0) {
      return;
    }

    this.pendingRequest = true;

    const data = JSON.stringify(this.buffer);

    try {
      const response = await fetch('http://localhost:8888/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      });

      if (response.ok) {
        this.buffer = [];
      } else {
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      console.error('Error sending buffer:', error);
    } finally {
      this.pendingRequest = false;
    }
  }
}

(<any>window).tracker = Tracker.getInstance();

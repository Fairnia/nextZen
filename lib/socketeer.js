import EventEmitter from 'events';

export default class Socketeer {
    constructor() {
        this.events = new EventEmitter();
        this.lastSeenTimestamp = 0;
    }

    async send(channel, type, message) {
        await fetch(`/api/sockets/${channel}`, {
            method: 'POST',
            body: JSON.stringify({
                type,
                message,
                timestamp: Date.now(),
            }),
            headers: {
                'Content-Type': 'application/json'
            },
        })
    }

    listen(channel) {
        this.listenIntervals = setInterval(async () => {
            try {
                const response = await fetch(`/api/sockets/${channel}`, {
                    headers: {
                        'x-last-seen': this.lastSeenTimestamp
                    }
                })
                const responseBody = await response.json();

                for (const message of responseBody) {
                    this.events.emit(message.type, message);
                    this.lastSeenTimestamp = message.timestamp;
                }
            } catch (error) {
                console.error(error);
            }
        }, 1000);
    }

    stopListening(channel) {
        clearInterval(this.listenIntervals);
        this.listenIntervals = null;
    }
}
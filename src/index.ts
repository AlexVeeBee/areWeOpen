import Express from "express";
import fs from "fs";

const configFile = "./config/config.json";

const defaultConfigSchedule : Record<string, timeSchedule> = {
    monday: {
        closedAllDay: false,
        open: "9:00",
        close: "17:00"
    },
    tuesday: {
        closedAllDay: false,
        open: "9:00",
        close: "17:00"
    },
    wednesday: {
        closedAllDay: false,
        open: "9:00",
        close: "17:00"
    },
    thursday: {
        closedAllDay: false,
        open: "9:00",
        close: "17:00"
    },
    friday: {
        closedAllDay: false,
        open: "9:00",
        close: "17:00"
    },
    saturday: {
        closedAllDay: false,
        open: "9:00",
        close: "17:00"
    },
    sunday: {
        closedAllDay: true,
        open: "0:00",
        close: "0:00"
    }
}

type FileConfigEvent = "configLoaded" | "configSaved" | "configError" | "configChanged";

class FileConfig extends EventTarget {
    port: number;
    schedule: Record<string, timeSchedule>;
    watcher: fs.FSWatcher | null = null;

    constructor(port: number, schedule: Record<string, timeSchedule>) {
        super();
        this.port = port;
        this.schedule = schedule;
    }

    async init() {
        console.log("Initializing config");
        try {
            const data = await fs.promises
                .readFile(configFile, "utf-8");
            const config = JSON.parse(data);
            this.port = config.port;
            this.schedule = config.schedule;
            this.dispatchEvent(new Event("configLoaded"));
        } catch (err) {
            console.error("Error reading config file", err);
            console.error(">>> Creating default config file");
            await this.createDefaultConfig();
        }
    }

    async createDefaultConfig() {
        try {
            await fs.promises.mkdir("./config", { recursive: true });
            await fs.promises.writeFile(configFile, JSON.stringify({
                port: this.port,
                schedule: this.schedule
            }, null, 2));
            this.init();
        } catch (err) {
            console.error("Error creating default config file. Using default values", err);
            this.dispatchEvent(new Event("configError"));
        }
    }

    async save() {
        try {
            await fs.promises.writeFile(configFile, JSON.stringify({
                port: this.port,
                schedule: this.schedule
            }, null, 2));
            this.dispatchEvent(new Event("configSaved"));
        } catch (err) {
            console.error("Error saving config file", err);
            this.dispatchEvent(new Event("configError"));
        }
    }

    on(event: FileConfigEvent, callback: EventListener) {
        this.addEventListener(event, callback);
    }

    off(event: FileConfigEvent, callback: EventListener) {
        this.removeEventListener(event, callback);
    }

    watchConfigFile(onChange: () => void) {
        const watcher = fs.watch(configFile, (eventType, filename) => {
            if (eventType === "change") {
                onChange();
            }
        });
    }
}


interface timeSchedule {
    closedAllDay: boolean;
    open: string;
    close: string;
}

let timeSchedule: Record<string, timeSchedule> = {}

let areWeOpen = false;

let config = new FileConfig(3000, defaultConfigSchedule);


config.on("configError", () => {
    console.error("Error loading config file. Using default values");
});

config.on("configSaved", () => {
    console.log("Config saved");
    timeSchedule = config.schedule;
});

const app = Express();

const StringTimeToDateTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return new Date(0, 0, 0, parseInt(hours), parseInt(minutes));
}
const TimeRange = (start: string, end: string) => {
    const startTime = StringTimeToDateTime(start);
    const endTime = StringTimeToDateTime(end);
    return (time: string) => {
        const currentTime = StringTimeToDateTime(time);
        return currentTime >= startTime && currentTime <= endTime;
    }
}

const getDayOfWeek = (day: number) => {
    switch (day) {
        case 0:
            return "sunday";
        case 1:
            return "monday";
        case 2:
            return "tuesday";
        case 3:
            return "wednesday";
        case 4:
            return "thursday";
        case 5:
            return "friday";
        case 6:
            return "saturday";
        default:
            return "Invalid day";
    }
}

const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

app.get("/", (req, res) => {
    const date = new Date();
    const day = getDayOfWeek(date.getDay());
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentTime = `${hours}:${minutes}`;

    console.log(`Current time: ${currentTime}`);
    console.log(`Day: ${day}`);
    console.log(`Schedule: ${JSON.stringify(timeSchedule[day])}`);

    if (!timeSchedule[day]) {
        throw new Error("Invalid day");
    }

    if (timeSchedule[day].closedAllDay) {
        areWeOpen = false;
    } else if (TimeRange(timeSchedule[day].open, timeSchedule[day].close)(currentTime)) {
        areWeOpen = true;
    } else {
        areWeOpen = false;
    }

    res.send({
        currentTime: currentTime,
        timeZone: timeZone,
        schedule: timeSchedule[day],
        day: day,
        dayOfWeek: date.getDay(),
        areWeOpen: areWeOpen,
    });
});

( async () => {
    await config.init();
    config.watchConfigFile(() => {
        config.init();
    });
    app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`);
        console.log(`http://localhost:${config.port}`);
    });
} )();

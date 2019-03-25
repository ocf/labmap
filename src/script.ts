"use strict";

const mapping: { [index: string]: string } = {
    sinkhole: "c1",
    destruction: "c2",
    firewhirl: "c3",
    outbreak: "c4",
    cyclone: "c5",
    venom: "c6",
    drought: "c7",
    volcano: "c8",
    blight: "c9",
    hailstorm: "c10",
    arsenic: "c11",
    heatwave: "c12",
    cyanide: "c13",
    acid: "c14",
    invasion: "c15",
    eruption: "c16",
    headcrash: "c17",
    asteroid: "c18",
    avalanche: "c19",
    blackout: "c20",
    plague: "c21",
    bigbang: "c22",
    wildfire: "c23",
    famine: "c24",
    madcow: "c25",
    surge: "c26",
    meteorstorm: "c27",
    chaos: "c28",
    blizzard: "c29",
    hurricane: "c32",
};

// Time is represented as seconds since midnight
type Time = number;
type TimeRange = [Time, Time];

function hour(t: Time): number {
    return Math.floor(t / (60 * 60));
}

function minute(t: Time): number {
    return Math.floor((t % (60 * 60)) / 60);
}

function second(t: Time): number {
    // no leap seconds, sorry IERS
    return Math.floor(t % 60);
}

function getTime(d: Date = new Date()): Time {
    return d.getHours() * 60 * 60 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
}

/**
 * Convert a time string to a Time instance.
 */
function parseTime(s: string): Time {
    const ints = s.split(":").map((x) => parseInt(x, 10)).concat([0, 0]);
    return ints[0] * 60 * 60 + ints[1] * 60 + ints[2];
}

/**
 * Convert a Time to a shortened time like "12:30 pm"
 *
 * 12:00:00 -> 12 pm
 * 16:30:00 -> 4:30 pm
 * 09:15:15 -> 9:15:15 am
 */
function shortTime(t: Time): string {
    const ints = [hour(t), minute(t), second(t)];

    // only show significant parts of the time
    while (ints[ints.length - 1] === 0) {
        ints.pop();
    }

    // midnight special case
    if (ints.length === 0) {
        return "12 am";
    }

    let suffix = "am";
    if (ints[0] >= 12 && ints[0] !== 24) {
        suffix = "pm";
    }
    if (ints[0] === 0) {
        ints[0] = 12;
    }
    if (ints[0] > 12) {
        ints[0] -= 12;
    }
    return ints.join(":") + " " + suffix;
}

function hasOverlap<T>(x: Iterable<T>, set: Set<T>): boolean {
    for (const e of x) {
        if (set.has(e)) {
            return true;
        }
    }
    return false;
}

// HTTP GET that returns a promise
function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open("GET", url);

    req.onload = function() {
      if (req.status === 200) {
        resolve(req.response);
      } else {
        reject(Error(req.statusText));
      }
    };

    req.onerror = function() {
      reject(Error("Network Error"));
    };

    req.send();
  });
}

let todaysHours: TimeRange[] = [];

/**
 * Returns True if the lab is open during the given timeranges at time `when`
 * @param ranges The list of timeranges when the lab is open
 * @param when The time to check, default is now
 */
function isOpen(ranges: TimeRange[] = todaysHours, when: Time = getTime()): boolean {
    for (const range of ranges) {
        if (when >= range[0] && when < range[1]) {
            return true;
        }
    }

    return false;
}

function getDesktopsInUse(): Promise<string[]> {
    return get("https://www.ocf.berkeley.edu/api/lab/desktops").then(
        (response) => JSON.parse(response)["public_desktops_in_use"],
    );
}

function getHoursToday(): Promise<TimeRange[]> {
    return get("https://www.ocf.berkeley.edu/api/hours/today").then(
        (resp) => JSON.parse(resp).map((x: string[]) => x.map(parseTime)),
    );
}

// Called every second to check if we should be in nightmode
function updateTheme(): void {
    document.body.classList.toggle("nightmode", !isOpen());
}

// Called every second
function updateClock(): void {
    const time = new Date();
    const clockTextElm = document.getElementById("clock-text");
    let formattedTimeText = time.toLocaleString("en-US", { hour: "numeric", minute: "numeric", hour12: true });
    if (time.getSeconds() % 2) { // to make the blinking effect
        formattedTimeText = formattedTimeText.replace(":", " ");
    }
    if (clockTextElm == null) {
        console.log("clock text element not found");
    } else {
        clockTextElm.textContent = formattedTimeText;
    }
}

// Called whenever we get new information about which desktops are in use
function updateDesktops(desktopsInUse: Iterable<string>): void {
    const idInUse = new Set();
    for (const desktopName of desktopsInUse) {
        idInUse.add(mapping[desktopName]);
    }
    // Temporary fix to always show eruption and destruction as being in use.
    // TODO: there should be an API for public_desktops_free, which we
    //       should be using instead. That better represents the purpose
    //       of this utility anyways.
    idInUse.add(mapping["eruption"]);

    for (const polygon of document.getElementsByClassName("comp")) {
        if (hasOverlap(polygon.classList, idInUse)) {
            polygon.classList.add("occupied");
            polygon.classList.remove("available");
            const parent = polygon.parentNode;
            if (parent == null) {
                console.log("polygon has no parent");
            } else {
                (parent.parentNode as Element).classList.remove("bounce");
            }
        } else {
            polygon.classList.remove("occupied");
            polygon.classList.add("available");
            const parent = polygon.parentNode;
            if (parent == null) {
                console.log("polygon has no parent");
            } else {
                (parent.parentNode as Element).classList.add("bounce");
            }
        }
    }
}

// Called whenever we get a new sample of today's hours
function updateHours(hoursListing: TimeRange[]): void {
    todaysHours = hoursListing;

    let hoursText;
    if (todaysHours.length === 0) {
        hoursText = "Closed all day";
    } else {
        // Convert the hoursListing to a human-readable format
        hoursText = todaysHours.map((range) =>
            range.map(shortTime).join(" - "),
        ).join(", ");
    }

    // Set the hours display on the website
    document.getElementById("labhours")!.textContent = hoursText;

    // Update hours again at midnight
    const now = new Date();
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    tomorrow.setHours(0, 0, 30);

    setTimeout(() => {
        getHoursToday().then(updateHours);
    }, tomorrow.getTime() - now.getTime());
}

// Start the HTTP request to get today's hours before the page finishes loading
const promiseGetHours = getHoursToday();

window.onload = function() {
    // Add tooltips for mousing over the desktops
    for (const key of Object.keys(mapping)) {
        const tooltip = document.createElement("div");
        tooltip.classList.add("mdl-tooltip");
        tooltip.setAttribute("data-mdl-for", mapping[key]);
        tooltip.textContent = key;
        document.body.appendChild(tooltip);
    }

    // Update the clock every second
    setInterval(updateClock, 1000);
    updateClock();

    // Update the desktops every 2.5 seconds
    setInterval(() => getDesktopsInUse().then(updateDesktops), 2500);

    // Only update hours with the results from this request after the page has finished loading
    promiseGetHours.then((hoursArray) => {
        updateHours(hoursArray);

        // Every second, check if we need to switch to nightMode
        setInterval(updateTheme, 1000);
    });
};

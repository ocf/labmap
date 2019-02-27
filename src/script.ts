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

/**
 * Convert a time like "12:30:00" to a shortened time like "12:30 pm"
 *
 * 12:00:00 -> 12 pm
 * 16:30:00 -> 4:30 pm
 * 09:15:15 -> 9:15:15 am
 */
function shortTime(t: string): string {
    const ints = t.split(":").map((x) => parseInt(x, 10));

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

function getDesktopsInUse(): Promise<string[]> {
    return get("https://www.ocf.berkeley.edu/api/lab/desktops").then(
        (response) => JSON.parse(response)["public_desktops_in_use"],
    );
}

function getHoursToday(): Promise<Array<string | null>> {
    return get("https://www.ocf.berkeley.edu/api/hours/today").then(
        (response) => JSON.parse(response),
    );
}

function enableNightMode(): void {
    document.body.classList.add("nightmode");
}

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

function updateMap(desktopsInUse: Iterable<string>): void {
    const idInUse = new Set();
    for (const desktopName of desktopsInUse) {
        idInUse.add(mapping[desktopName]);
    }
    // Temporary fix to always show eruption and destruction as being in use.
    // TODO: there should be an API for public_desktops_free, which we
    //       should be using instead. That better represents the purpose
    //       of this utility anyways.
    idInUse.add(mapping["eruption"]);
    idInUse.add(mapping["invasion"]);

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

    // Reload the page at 6am
    const now = new Date();
    let reloadTimer = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0).getTime() - now.getTime();
    if (reloadTimer < 0) {
        reloadTimer += 24 * 60 * 60 * 1000;
    }
    setTimeout(location.reload, reloadTimer);

    // Update the clock every second
    setInterval(updateClock, 1000);
    updateClock();

    // Update the desktops every 2.5 seconds
    setInterval(() => getDesktopsInUse().then(updateMap), 2500);

    // Only update hours with the results from this request after the page has finished loading
    promiseGetHours.then((hoursArray) => {
        const hours = hoursArray[0];
        if (hours !== null) {
            const start = document.getElementById("starthours");
            const end = document.getElementById("endhours");

            if (start == null) {
                console.log("document has no start time");
            } else {
                start.textContent = shortTime(hours[0]);
            }

            if (end == null) {
                console.log("document has no end time");
            } else {
                end.textContent = shortTime(hours[1]);
            }

            const closingTime = parseInt(hours[1].split(":")[0], 10);
            const nightDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), closingTime, 0, 0, 0);
            const nightTimer = nightDate.getTime() - now.getTime();
            if (now.getHours() >= closingTime || now.getHours() <= 5) {
                enableNightMode();
            }
            if (nightTimer > 0) {
                setTimeout(enableNightMode, nightTimer);
            }
        } else {
            enableNightMode();

            const labhours = document.getElementById("labhours");

            if (labhours == null) {
                console.log("labhours element not found");
            } else {
                labhours.innerHTML = "";
            }

            const labtext = document.getElementById("labtext");

            if (labtext == null) {
                console.log("labtext element not found");
            } else {
                labtext.textContent = "Closed all day.";
            }
        }
    });
};

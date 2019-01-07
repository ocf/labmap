'use strict';

const mapping = {
    'sinkhole': 'c1',
    'destruction': 'c2',
    'firewhirl': 'c3',
    'outbreak': 'c4',
    'cyclone': 'c5',
    'venom': 'c6',
    'drought': 'c7',
    'volcano': 'c8',
    'blight': 'c9',
    'hailstorm': 'c10',
    'arsenic': 'c11',
    'heatwave': 'c12',
    'cyanide': 'c13',
    'acid': 'c14',
    'invasion': 'c15',
    'eruption': 'c16',
    'headcrash': 'c17',
    'asteroid': 'c18',
    'avalanche': 'c19',
    'blackout': 'c20',
    'plague': 'c21',
    'bigbang': 'c22',
    'wildfire': 'c23',
    'famine': 'c24',
    'madcow': 'c25',
    'surge': 'c26',
    'meteorstorm': 'c27',
    'chaos': 'c28',
    'blizzard': 'c29',
    'hurricane': 'c32',
};

/**
 * Convert a time like "12:30:00" to a shortened time like "12:30 pm"
 *
 * 12:00:00 -> 12 pm
 * 16:30:00 -> 4:30 pm
 * 09:15:15 -> 9:15:15 am
 */
function shortTime(t) {
    const ints = t.split(':').map(x => parseInt(x));

    // only show significant parts of the time
    while (ints[ints.length - 1] === 0) {
        ints.pop();
    }

    // midnight special case
    if (ints.length === 0) {
        return '12 am';
    }

    let suffix = 'am';
    if (ints[0] >= 12 && ints[0] !== 24) {
        suffix = 'pm';
    }
    if (ints[0] === 0) {
        ints[0] = 12;
    }
    if (ints[0] > 12) {
        ints[0] -= 12;
    }
    return ints.join(':') + ' ' + suffix;
}

function hasOverlap(x, set) {
    for (const e of x) {
        if (set.has(e)) {
            return true;
        }
    }
    return false;
}

// HTTP GET that returns a promise
function get(url) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        reject(Error(req.statusText));
      }
    };

    req.onerror = function() {
      reject(Error('Network Error'));
    };

    req.send();
  });
}

function getDesktopsInUse() {
    return get('https://www.ocf.berkeley.edu/api/lab/desktops').then(
        response => JSON.parse(response)['public_desktops_in_use']
    );
}

function getHoursToday() {
    return get('https://www.ocf.berkeley.edu/api/hours/today').then(
        response => JSON.parse(response)
    );
}

function enableNightMode() {
    document.body.classList.add('nightmode');
}

function updateMap(desktopsInUse) {
    const idInUse = new Set();
    for (const desktopName of desktopsInUse) {
        idInUse.add(mapping[desktopName]);
    }
    // Temporary fix to always show eruption and destruction as being in use.
    // TODO: there should be an API for public_desktops_free, which we
    //       should be using instead. That better represents the purpose
    //       of this utility anyways.
    idInUse.add(mapping['eruption']);

    for (const polygon of document.getElementsByClassName('comp')) {
        if (hasOverlap(polygon.classList, idInUse)) {
            polygon.classList.add('occupied');
            polygon.classList.remove('available');
            polygon.parentNode.parentNode.classList.remove('bounce');
        } else {
            polygon.classList.remove('occupied');
            polygon.classList.add('available');
            polygon.parentNode.parentNode.classList.add('bounce');
        }
    }
}

// Start the HTTP request to get today's hours before the page finishes loading
const promiseGetHours = getHoursToday();

window.onload = function() {
    // Add tooltips for mousing over the desktops
    for (const key of Object.keys(mapping)) {
        const tooltip = document.createElement('div');
        tooltip.classList.add('mdl-tooltip');
        tooltip.setAttribute('data-mdl-for', mapping[key]);
        tooltip.textContent = key;
        document.body.appendChild(tooltip);
    }

    // Reload the page at 6am
    const now = new Date();
    const reloadTimer = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0) - now;
    if (reloadTimer < 0) {
        reloadTimer += 24 * 60 * 60 * 1000;
    }
    setTimeout(location.reload, reloadTimer);

    // Update the desktops every 2.5 seconds
    setInterval(() => getDesktopsInUse().then(updateMap), 2500);

    // Only update hours with the results from this request after the page has finished loading
    promiseGetHours.then(hours => {
        if (hours[0] !== null) {
            hours = hours[0];
            const start = document.getElementById('starthours');
            const end = document.getElementById('endhours');

            start.textContent = shortTime(hours[0]);
            end.textContent = shortTime(hours[1]);

            const closingTime = hours[1];
            const nightTimer = new Date(now.getFullYear(), now.getMonth(), now.getDate(), closingTime, 0, 0, 0) - now;
            if (now.getHours() >= closingTime || now.getHours() <= 5) {
                enableNightMode();
            }
            if (nightTimer > 0) {
                setTimeout(nightMode, nightTimer);
            }
        } else {
            nightMode();
            document.getElementById('labhours').innerHTML = '';
            document.getElementById('labtext').textContent = 'Closed all day.';
        }
    });
}

const form = document.getElementById('attendance-form');
const userName = document.getElementById('user-name');
const attendanceType = document.getElementById('attendance-type');
const attendanceTime = document.getElementById('attendance-time');
const submitButton = document.getElementById('submit-button');
const geoStatus = document.getElementById('geo-status');
const recentEntry = document.getElementById('recent-entry');
const attendanceLocation = document.getElementById('attendance-location');
const attendanceLocationOther = document.getElementById('attendance-location-other');

const officeLocation = {
latitude: 9.9772990668531392,
  longitude: 118.73658415681145,
  radiusMeters: 150,
};
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwB8CrtXHOJfv7fWoxTYam9aMjq-cgYhqb--s5hSHfh-3hTS2sCLk78YGPzuUq7EpBFg/exec';

let currentLocation = null;
let locationOk = false;

function formatTime(date) {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function updateTime() {
  attendanceTime.value = formatTime(new Date());
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function setGeoStatus(message, status) {
  geoStatus.textContent = message;
  geoStatus.className = `geo-status ${status}`;
}

function evaluateLocation(position) {
  const { latitude, longitude } = position.coords;
  currentLocation = { latitude, longitude };
  const distance = getDistanceMeters(latitude, longitude, officeLocation.latitude, officeLocation.longitude);
  locationOk = distance <= officeLocation.radiusMeters;

  if (locationOk) {
    setGeoStatus(`Location confirmed: ${distance.toFixed(0)}m from office. Attendance can be submitted.`, 'success');
    submitButton.disabled = false;
  } else {
    setGeoStatus(`You are ${distance.toFixed(0)}m away from the allowed location. Move closer to submit.`, 'error');
    submitButton.disabled = true;
  }
}

function handleGeoError(error) {
  console.warn('Geolocation error', error);
  setGeoStatus('Unable to detect location. Allow geolocation to submit attendance.', 'error');
  submitButton.disabled = true;
}

function requestLocation() {
  if (!navigator.geolocation) {
    setGeoStatus('Geolocation is not supported by your browser.', 'error');
    submitButton.disabled = true;
    return;
  }

  navigator.geolocation.getCurrentPosition(evaluateLocation, handleGeoError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  });
}

function getSelectedLocation() {
  if (attendanceLocation.value === 'Other') {
    return attendanceLocationOther.value.trim() || 'Other location';
  }
  return attendanceLocation.value;
}

function updateRecentEntry(data) {
  recentEntry.innerHTML = `
    <strong>${data.name}</strong> — <em>${data.status}</em><br />
    ${data.time}<br />
    Room: ${data.location}<br />
    GPS: ${data.geoLocation}
  `;
}

function canSubmit() {
  const hasName = userName.value;
  const hasStatus = attendanceType.value;
  const hasLocation = attendanceLocation.value && (attendanceLocation.value !== 'Other' || attendanceLocationOther.value.trim());
  return locationOk && hasName && hasStatus && hasLocation;
}

function submitAttendance(event) {
  event.preventDefault();
  if (!locationOk || !currentLocation) {
    setGeoStatus('Cannot submit because location is not valid.', 'error');
    return;
  }

  if (!attendanceLocation.value || (attendanceLocation.value === 'Other' && !attendanceLocationOther.value.trim())) {
    setGeoStatus('Please select or enter the time-in location.', 'error');
    return;
  }

  const room = getSelectedLocation();
  const payload = {
    name: userName.value,
    status: attendanceType.value,
    time: attendanceTime.value,
    location: room,
    geoLocation: `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
  };

  const hiddenForm = document.createElement('form');
  hiddenForm.method = 'POST';
  hiddenForm.action = GOOGLE_SCRIPT_URL;
  hiddenForm.style.display = 'none';

  Object.keys(payload).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = payload[key];
    hiddenForm.appendChild(input);
  });

  document.body.appendChild(hiddenForm);
  
  // Show success immediately (data will be written by the script)
  updateRecentEntry(payload);
  setGeoStatus('Attendance recorded successfully.', 'success');
  form.reset();
  submitButton.disabled = true;

  // Submit and clean up
  hiddenForm.submit();
  setTimeout(() => document.body.removeChild(hiddenForm), 1000);
}

form.addEventListener('submit', submitAttendance);
userName.addEventListener('change', () => {
  submitButton.disabled = !canSubmit();
});
attendanceType.addEventListener('change', () => {
  submitButton.disabled = !canSubmit();
});
attendanceLocation.addEventListener('change', () => {
  if (attendanceLocation.value === 'Other') {
    attendanceLocationOther.style.display = 'block';
    attendanceLocationOther.required = true;
  } else {
    attendanceLocationOther.style.display = 'none';
    attendanceLocationOther.required = false;
    attendanceLocationOther.value = '';
  }
  submitButton.disabled = !canSubmit();
});
attendanceLocationOther.addEventListener('input', () => {
  submitButton.disabled = !canSubmit();
});

setInterval(updateTime, 1000);
updateTime();
requestLocation();

/**
 * Prayer Times API Integration using AlAdhan API
 * Provides Sehri (Fajr) and Iftar (Maghrib) timings for any city
 */

export interface PrayerTimings {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    sunrise: string;
}

export interface PrayerTimesResponse {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    city: string;
    country: string;
    date: string;
}

/**
 * Fetch prayer times for a specific city and date
 * @param city - City name (e.g., "Delhi", "Mumbai", "Dubai")
 * @param country - Country name (e.g., "India", "UAE", "Pakistan")
 * @param date - Optional date in DD-MM-YYYY format (defaults to today)
 * @returns Prayer timings including Fajr (Sehri) and Maghrib (Iftar)
 */
export async function fetchPrayerTimes(
    city: string,
    country: string,
    date?: string
): Promise<PrayerTimesResponse> {
    try {
        const dateParam = date || new Date().toLocaleDateString('en-GB').split('/').join('-');
        const url = `https://api.aladhan.com/v1/timingsByCity/${dateParam}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 200 || !data.data) {
            throw new Error('Invalid API response');
        }

        const timings = data.data.timings;

        return {
            fajr: formatPrayerTime(timings.Fajr),
            dhuhr: formatPrayerTime(timings.Dhuhr),
            asr: formatPrayerTime(timings.Asr),
            maghrib: formatPrayerTime(timings.Maghrib),
            isha: formatPrayerTime(timings.Isha),
            city,
            country,
            date: data.data.date.readable
        };
    } catch (error) {
        console.error('Error fetching prayer times:', error);
        throw error;
    }
}

/**
 * Get today's prayer times for a city
 * @param city - City name
 * @param country - Country name
 * @returns Today's Fajr (Sehri) and Maghrib (Iftar) times
 */
export async function getTodaysPrayerTimes(
    city: string,
    country: string
): Promise<PrayerTimesResponse> {
    return fetchPrayerTimes(city, country);
}

/**
 * Format prayer time from 24-hour to 12-hour format
 * @param time - Time string in HH:MM format (e.g., "05:30", "18:45")
 * @returns Formatted time in 12-hour format (e.g., "5:30 AM", "6:45 PM")
 */
export function formatPrayerTime(time: string): string {
    // Remove timezone info if present (e.g., "05:30 (IST)" -> "05:30")
    const cleanTime = time.split(' ')[0];

    const [hours, minutes] = cleanTime.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
        return time; // Return original if parsing fails
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get cached prayer times from localStorage
 * @param city - City name
 * @param country - Country name
 * @returns Cached prayer times or null
 */
export function getCachedPrayerTimes(city: string, country: string): PrayerTimesResponse | null {
    try {
        const cacheKey = `prayer_times_${city}_${country}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) return null;

        const data = JSON.parse(cached);

        // Validate cache structure (ensure new fields exist)
        if (!data.times || !data.times.dhuhr || !data.times.asr) {
            // Invalid/Old cache structure - force refresh
            localStorage.removeItem(cacheKey);
            return null;
        }

        const cachedDate = new Date(data.timestamp);
        const now = new Date();

        // Cache is valid for 24 hours
        const hoursDiff = (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return data.times;
    } catch (error) {
        console.error('Error reading cached prayer times:', error);
        return null;
    }
}

/**
 * Cache prayer times to localStorage
 * @param times - Prayer times to cache
 */
export function cachePrayerTimes(times: PrayerTimesResponse): void {
    try {
        const cacheKey = `prayer_times_${times.city}_${times.country}`;
        const cacheData = {
            times,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error caching prayer times:', error);
    }
}
